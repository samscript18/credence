// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IPaymentToken {
    function balanceOf(address account) external view returns (uint256);
}

interface IDreamDexWindow {
    // Verified against markets-sdk MarketOnchain / binaryMarketReadAbi.
    function status() external view returns (uint8);

    function expiry() external view returns (uint64);
}

/// @notice Shannon MVP escrow. No admin withdrawal and no server signing key.
/// @dev "Revealed" means the buyer explicitly authorized application access.
/// Delivery is retriable through Credence after the receipt, not atomic with HTTP.
contract InsightEscrow {
    enum State {
        None,
        Deposited,
        Revealed,
        Refunded
    }
    struct Payment {
        address predictor;
        address market;
        uint64 expiry;
        State state;
    }
    address public immutable token;
    uint256 public immutable price;
    uint256 public constant unlockBufferSeconds = 60;
    mapping(bytes32 => mapping(address => Payment)) public payments;
    uint256 private entered;

    event Deposited(
        bytes32 indexed prediction,
        address indexed buyer,
        address predictor,
        address market,
        uint64 expiry
    );
    event Revealed(bytes32 indexed prediction, address indexed buyer);
    event Refunded(bytes32 indexed prediction, address indexed buyer);

    modifier nonReentrant() {
        require(entered == 0, "Reentrant call");
        entered = 1;
        _;
        entered = 0;
    }

    constructor(address paymentToken, uint256 unlockPrice) {
        require(
            paymentToken.code.length > 0 && unlockPrice > 0,
            "Invalid payment config"
        );
        token = paymentToken;
        price = unlockPrice;
    }

    function live(address market, uint64 expiry) public view returns (bool) {
        if (block.timestamp >= expiry) return false;
        try IDreamDexWindow(market).status() returns (uint8 status) {
            return status == 1;
        } catch {
            return false;
        }
    }

    function deposit(
        bytes32 prediction,
        address predictor,
        address market,
        uint64 expiry
    ) external nonReentrant {
        require(
            prediction != bytes32(0) &&
                predictor != address(0) &&
                predictor != msg.sender,
            "Invalid prediction"
        );
        require(live(market, expiry), "This window has ended");
        require(
            uint256(expiry) - block.timestamp > unlockBufferSeconds,
            "Insight sales closed"
        );
        require(
            IDreamDexWindow(market).expiry() == expiry,
            "Wrong window expiry"
        );
        require(
            payments[prediction][msg.sender].state == State.None,
            "Already paid"
        );
        payments[prediction][msg.sender] = Payment(
            predictor,
            market,
            expiry,
            State.Deposited
        );
        uint256 beforeBalance = IPaymentToken(token).balanceOf(address(this));
        safeTokenCall(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                address(this),
                price
            )
        );
        require(
            IPaymentToken(token).balanceOf(address(this)) ==
                beforeBalance + price,
            "Unsupported transfer fee"
        );
        emit Deposited(prediction, msg.sender, predictor, market, expiry);
    }

    function reveal(bytes32 prediction) external nonReentrant {
        Payment storage payment = payments[prediction][msg.sender];
        require(payment.state == State.Deposited, "No unused payment");
        require(live(payment.market, payment.expiry), "This window has ended");
        payment.state = State.Revealed;
        safeTokenCall(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                payment.predictor,
                price
            )
        );
        emit Revealed(prediction, msg.sender);
    }

    /// Anyone can pay gas to refund, but funds always return to the original buyer.
    function refund(bytes32 prediction, address buyer) external nonReentrant {
        Payment storage payment = payments[prediction][buyer];
        require(payment.state == State.Deposited, "No unused payment");
        require(!live(payment.market, payment.expiry), "Window is still live");
        payment.state = State.Refunded;
        safeTokenCall(
            abi.encodeWithSignature("transfer(address,uint256)", buyer, price)
        );
        emit Refunded(prediction, buyer);
    }

    function safeTokenCall(bytes memory data) private {
        (bool success, bytes memory result) = token.call(data);
        require(
            success && (result.length == 0 || abi.decode(result, (bool))),
            "Token transfer failed"
        );
    }
}
