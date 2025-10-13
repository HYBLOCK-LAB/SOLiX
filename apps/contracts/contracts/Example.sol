// SPDX-License-Identifier: MIT
// 라이선스 식별자입니다. 배포/검증 툴이 소스 파일의 라이선스를 자동 인식할 수 있게 합니다.
pragma solidity ^0.8.28;

// 문자열 메시지를 저장/조회하고, 컨트랙트로 ETH를 입금/출금하는 컨트랙트입니다.
contract Example {
    // 소유자 주소입니다. immutable 변수는 생성자에서 한 번 설정하면 이후 변경 불가이며
    // 저장 방식이 최적화되어 가스 비용을 절약할 수 있습니다.
    address public immutable owner;

    // 저장된 메시지입니다. `private` 이므로 외부에서 직접 읽을 수 없고,
    // `readMessage()`를 통해서만 접근하도록 캡슐화합니다.
    // 상태변수는 Storage(영구 저장소)에 존재하며, 변경 시 가스가 듭니다.
    string private storedMessage;

    // 새로운 메시지를 기록할 때 발생하는 이벤트입니다.
    // 이벤트는 트랜잭션 로그에 기록되어 인덱싱/검색하기 쉽습니다.
    event MessageUpdated(string newMessage);

    // 입금 발생 시 누가 얼마를 보냈는지 기록합니다.
    // `indexed` 키워드를 사용하면 해당 파라미터가 토픽으로 인덱싱되어 필터링이 쉬워집니다.
    event Deposited(address indexed from, uint256 amount);

    // 출금 발생 시 수신자와 금액을 기록합니다.
    event Withdrawn(address indexed to, uint256 amount);

    // 컨트랙트를 배포하면서 초기 메시지를 설정합니다.
    // 배포 시점의 `msg.sender`가 곧 소유자(owner)가 됩니다.
    constructor(string memory initialMessage) {
        owner = msg.sender; // immutable 변수는 여기서만 할당 가능
        storedMessage = initialMessage;
    }

    //현재 저장된 메시지를 반환합니다.
    //`view` 함수는 상태를 변경하지 않으며, eth_call(오프체인)로 호출 시 가스 비용이 들지 않습니다.
    function readMessage() external view returns (string memory) {
        return storedMessage;
    }

    // 소유자만 메시지를 변경할 수 있습니다.
    // 파라미터를 `calldata`로 받아 불필요한 복사를 줄여 가스 비용을 절약합니다.
    // 변경 후 `MessageUpdated` 이벤트를 발행합니다.
    function updateMessage(string calldata newMessage) external onlyOwner {
        storedMessage = newMessage; // Storage에 쓰기 — 가스 비용 발생
        emit MessageUpdated(newMessage);
    }

    // 컨트랙트로 ETH를 입금합니다.
    // 반드시 0보다 큰 `msg.value`가 필요합니다. 성공 시 `Deposited` 이벤트가 기록됩니다.
    // 컨트랙트에 `receive()`/`fallback()`이 없으므로, 명시적으로 `deposit()`을 호출해야 잔액이 증가합니다.
    function deposit() external payable {
        require(msg.value > 0, "VALUE_MUST_BE_POSITIVE");
        emit Deposited(msg.sender, msg.value);
        // 컨트랙트의 잔액은 `address(this).balance` 로 확인할 수 있습니다.
        // 외부에서 selfdestruct 또는 force-send로도 잔액이 늘 수 있다는 점을 염두에 두세요.
    }

    // 소유자가 컨트랙트 잔액 중 일부 또는 전부를 지정한 주소로 출금합니다.
    function withdraw(
        address payable receiver,
        uint256 amount
    ) external onlyOwner {
        require(amount <= address(this).balance, "INSUFFICIENT_FUNDS");
        receiver.transfer(amount); // 실패 시 자동 revert
        emit Withdrawn(receiver, amount);
    }

    // 컨트랙트의 보유 ETH 잔액을 조회합니다.
    // 단순 조회로, 오프체인 호출 시 가스가 들지 않습니다.
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // 접근 제어를 위한 modifier입니다.
    // 함수 실행 전에 `require`로 소유자 여부를 검사합니다.
    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }
}
