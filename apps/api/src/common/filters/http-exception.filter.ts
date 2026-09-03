import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

type ErrorPayload = {
  statusCode: number;
  message: string | string[];
  code?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const payload = this.toPayload(statusCode, exceptionResponse);

    if (!isHttpException && process.env.NODE_ENV !== "production") {
      console.error(exception);
    }

    response.status(statusCode).json(payload);
  }

  private toPayload(statusCode: number, value: string | object | undefined): ErrorPayload {
    if (typeof value === "string") {
      return { statusCode, message: value };
    }

    if (value && "message" in value) {
      const response = value as { message: string | string[]; code?: string };
      return {
        statusCode,
        message: response.message,
        ...(response.code ? { code: response.code } : {}),
      };
    }

    return {
      statusCode,
      message:
        statusCode === 500
          ? "Internal server error"
          : "Request failed",
    };
  }
}
