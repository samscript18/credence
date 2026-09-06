// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {InsightEscrow} from "../src/InsightEscrow.sol";

interface Vm {
    function prank(address) external;

    function warp(uint256) external;

    function expectRevert() external;
}

contract TestToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract TestWindow {
    uint8 public status = 1;
    uint64 public expiry = uint64(block.timestamp + 3600);

    function close() external {
        status = 2;
    }
}

contract InsightEscrowTest {
    Vm constant vm =
        Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    TestToken token;
    TestWindow market;
    InsightEscrow escrow;
    address constant buyer = address(100);
    address constant predictor = address(200);
    bytes32 constant prediction = keccak256("prediction");
    uint64 expiry;

    function setUp() public {
        token = new TestToken();
        market = new TestWindow();
        escrow = new InsightEscrow(address(token), 1e6);
        expiry = uint64(block.timestamp + 3600);
        token.mint(buyer, 2e6);
        vm.prank(buyer);
        token.approve(address(escrow), 2e6);
    }

    function pay() internal {
        vm.prank(buyer);
        escrow.deposit(prediction, predictor, address(market), expiry);
    }

    function testDepositDoesNotPayPredictor() public {
        pay();
        require(token.balanceOf(predictor) == 0);
        require(token.balanceOf(address(escrow)) == 1e6);
    }

    function testExplicitRevealPaysPredictor() public {
        pay();
        vm.prank(buyer);
        escrow.reveal(prediction);
        require(token.balanceOf(predictor) == 1e6);
    }

    function testClosedUnusedPaymentRefundsBuyer() public {
        pay();
        market.close();
        escrow.refund(prediction, buyer);
        require(token.balanceOf(buyer) == 2e6);
    }

    function testExpiryRefundsEvenIfStatusHasNotUpdated() public {
        pay();
        vm.warp(expiry);
        escrow.refund(prediction, buyer);
        require(token.balanceOf(buyer) == 2e6);
    }

    function testCannotRefundRevealedPayment() public {
        pay();
        vm.prank(buyer);
        escrow.reveal(prediction);
        market.close();
        vm.expectRevert();
        escrow.refund(prediction, buyer);
    }

    function testCannotRevealAfterClose() public {
        pay();
        market.close();
        vm.expectRevert();
        vm.prank(buyer);
        escrow.reveal(prediction);
    }

    function testCannotDepositAfterClose() public {
        market.close();
        vm.expectRevert();
        pay();
    }

    function testCannotRevealAnotherBuyersPayment() public {
        pay();
        vm.expectRevert();
        escrow.reveal(prediction);
    }

    function testCannotRefundTwice() public {
        pay();
        market.close();
        escrow.refund(prediction, buyer);
        vm.expectRevert();
        escrow.refund(prediction, buyer);
    }

    function testCannotPayTwice() public {
        pay();
        vm.expectRevert();
        pay();
    }

    function testCannotRefundLivePayment() public {
        pay();
        vm.expectRevert();
        escrow.refund(prediction, buyer);
    }

    function testCannotDepositInsideBuffer() public {
        vm.warp(expiry - 60);
        vm.expectRevert();
        pay();
    }

    function testCanDepositOutsideBuffer() public {
        vm.warp(expiry - 61);
        pay();
    }

    function testExistingBuyerCanRevealInsideBuffer() public {
        pay();
        vm.warp(expiry - 30);
        vm.prank(buyer);
        escrow.reveal(prediction);
        require(token.balanceOf(predictor) == 1e6);
    }

    function testCannotSupplySuccessorExpiry() public {
        vm.expectRevert();
        vm.prank(buyer);
        escrow.deposit(prediction, predictor, address(market), expiry + 3600);
    }
}
