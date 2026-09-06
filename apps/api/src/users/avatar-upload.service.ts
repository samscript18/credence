import { createHash, randomUUID } from "node:crypto";
import axios from "axios";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export function isAvatarImage(buffer: Buffer): boolean {
  return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP");
}

@Injectable()
export class AvatarUploadService {
  constructor(private readonly config: ConfigService) {}

  async upload(wallet: string, file?: { buffer: Buffer; size: number }): Promise<{ avatarUrl: string }> {
    if (!file || file.size > 2 * 1024 * 1024 || !isAvatarImage(file.buffer)) {
      throw new BadRequestException("Choose a PNG, JPEG or WebP image no larger than 2 MB.");
    }
    const cloud = this.config.get<string>("CLOUDINARY_CLOUD_NAME");
    const key = this.config.get<string>("CLOUDINARY_API_KEY");
    const secret = this.config.get<string>("CLOUDINARY_API_SECRET");
    if (!cloud || !key || !secret || !/^[a-z0-9_-]+$/i.test(cloud)) {
      throw new ServiceUnavailableException("Photo uploads are not configured. Please contact the app operator.");
    }
    // Cloudinary signs alphabetically sorted upload parameters; the API secret
    // stays on the server. Unique IDs avoid overwriting an existing avatar.
    const publicId = `credence/avatars/${wallet.toLowerCase()}/${randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHash("sha256").update(`public_id=${publicId}&timestamp=${timestamp}${secret}`).digest("hex");
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(file.buffer)]), "avatar");
    form.set("public_id", publicId);
    form.set("timestamp", timestamp);
    form.set("api_key", key);
    form.set("signature", signature);
    try {
      const { data } = await axios.post<{ secure_url: string }>(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, form, { timeout: 30_000, maxBodyLength: 3 * 1024 * 1024 });
      const url = new URL(data.secure_url);
      if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") throw new Error("Invalid upload response");
      return { avatarUrl: url.toString() };
    } catch {
      throw new ServiceUnavailableException("Photo upload failed. Please try again.");
    }
  }
}
