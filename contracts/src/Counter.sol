// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;
    address public lastCaller;

    function increment() public {
        number++;
        lastCaller = msg.sender;
    }
}
