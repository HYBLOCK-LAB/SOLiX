// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Example
/// @notice 메시지를 저장하고 간단한 입·출금 흐름을 실습하기 위한 예제 컨트랙트입니다.
contract Example {
    // 컨트랙트를 배포한 지갑 주소를 저장합니다.
    address public immutable owner;
    // 사용자가 최신 메시지를 확인할 수 있도록 문자열을 보관합니다.
    string private storedMessage;

    // 새로운 메시지가 등록될 때마다 알림을 보냅니다.
    event MessageUpdated(string newMessage);
    // 입금이 발생하면 누가 얼마를 보냈는지 기록합니다.
    event Deposited(address indexed from, uint256 amount);
    // 출금이 발생하면 수신자와 금액을 기록합니다.
    event Withdrawn(address indexed to, uint256 amount);

    // 배포 시 초기 메시지를 설정합니다.
    constructor(string memory initialMessage) {
        owner = msg.sender;
        storedMessage = initialMessage;
    }

    // 저장된 메시지를 조회합니다.
    function readMessage() external view returns (string memory) {
        return storedMessage;
    }

    // 컨트랙트 소유자만 메시지를 변경할 수 있습니다.
    function updateMessage(string calldata newMessage) external onlyOwner {
        storedMessage = newMessage;
        emit MessageUpdated(newMessage);
    }

    // 컨트랙트로 ETH를 입금하고 이벤트를 기록합니다.
    function deposit() external payable {
        require(msg.value > 0, "VALUE_MUST_BE_POSITIVE");
        emit Deposited(msg.sender, msg.value);
    }

    // 소유자가 원하는 지갑으로 보유 중인 ETH를 출금합니다.
    function withdraw(
        address payable receiver,
        uint256 amount
    ) external onlyOwner {
        require(amount <= address(this).balance, "INSUFFICIENT_FUNDS");
        receiver.transfer(amount);
        emit Withdrawn(receiver, amount);
    }

    // 컨트랙트에 쌓여 있는 ETH 잔액을 확인합니다.
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // 오직 소유자만 호출할 수 있도록 제한합니다.
    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }
}
