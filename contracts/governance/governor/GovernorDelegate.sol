// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;
import "hardhat/console.sol";

import "./IGovernor.sol";
import "./GovernorStorage.sol";

contract GovernorCharlieDelegate is GovernorCharlieDelegateStorage, GovernorCharlieEvents, IGovernorCharlieDelegate {
  /// @notice The name of this contract
  string public constant name = "Interest Protocol Governor";

  /// @notice The maximum number of actions that can be included in a proposal
  uint256 public constant proposalMaxOperations = 10;

  /// @notice The EIP-712 typehash for the contract's domain
  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

  /// @notice The EIP-712 typehash for the ballot struct used by the contract
  bytes32 public constant BALLOT_TYPEHASH = keccak256("Ballot(uint256 proposalId,uint8 support)");

  /// @notice The time for a proposal to be executed after passing
  uint256 public constant GRACE_PERIOD = 14 days;

  /**
   * @notice Used to initialize the contract during delegator contructor
   * @param ipt_ The address of the COMP token
   * @param votingPeriod_ The initial voting period
   * @param votingDelay_ The initial voting delay
   * @param proposalThreshold_ The initial proposal threshold
   * @param proposalTimelockDelay_ The initial proposal holding period
   */
  function initialize(
    address ipt_,
    uint256 votingPeriod_,
    uint256 votingDelay_,
    uint256 proposalThreshold_,
    uint256 proposalTimelockDelay_,
    uint256 quorumVotes_,
    uint256 emergencyQuorumVotes_,
    uint256 emergencyVotingPeriod_,
    uint256 emergencyTimelockDelay_
  ) external override {
    require(!initialized, "already been initialized");
    ipt = IIpt(ipt_);
    votingPeriod = votingPeriod_; //yes
    votingDelay = votingDelay_; //yes
    proposalThreshold = proposalThreshold_; //yes
    proposalTimelockDelay = proposalTimelockDelay_; //yes
    proposalCount = 0;
    quorumVotes = quorumVotes_; //yes
    emergencyQuorumVotes = emergencyQuorumVotes_; //yes
    emergencyVotingPeriod = emergencyVotingPeriod_; //yes
    emergencyTimelockDelay = emergencyTimelockDelay_;

    initialized = true;
  }

  /**
   * @notice Function used to propose a new proposal. Sender must have delegates above the proposal threshold
   * @param targets Target addresses for proposal calls
   * @param values Eth values for proposal calls
   * @param signatures Function signatures for proposal calls
   * @param calldatas Calldatas for proposal calls
   * @param description String description of the proposal
   * @return Proposal id of new proposal
   */
  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description,
    bool emergency
  ) public override returns (uint256) {
    // Reject proposals before initiating as Governor
    require(quorumVotes != 0, "Charlie not active");
    // Allow addresses above proposal threshold and whitelisted addresses to propose
    require(
      ipt.getPriorVotes(_msgSender(), sub256(block.number, 1)) >= proposalThreshold || isWhitelisted(_msgSender()),
      "votes below proposal threshold"
    );
    require(
      targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length,
      "information arity mismatch"
    );
    require(targets.length != 0, "must provide actions");
    require(targets.length <= proposalMaxOperations, "too many actions");

    uint256 latestProposalId = latestProposalIds[_msgSender()];
    if (latestProposalId != 0) {
      ProposalState proposersLatestProposalState = state(latestProposalId);
      require(proposersLatestProposalState != ProposalState.Active, "one live proposal per proposer");
      require(proposersLatestProposalState != ProposalState.Pending, "one live proposal per proposer");
    }

    proposalCount++;
    Proposal memory newProposal = Proposal({
      id: proposalCount,
      proposer: _msgSender(),
      eta: 0,
      targets: targets,
      values: values,
      signatures: signatures,
      calldatas: calldatas,
      startBlock: block.number + votingDelay,
      endBlock: block.number + votingDelay + votingPeriod,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      canceled: false,
      executed: false,
      emergency: emergency,
      quorumVotes: quorumVotes,
      delay: proposalTimelockDelay
    });

    if (emergency) {
      newProposal.startBlock = block.number;
      newProposal.endBlock = block.number + emergencyVotingPeriod;
      newProposal.quorumVotes = emergencyQuorumVotes;
      newProposal.delay = emergencyTimelockDelay;
    }

    proposals[newProposal.id] = newProposal;
    latestProposalIds[newProposal.proposer] = newProposal.id;

    emit ProposalCreated(
      newProposal.id,
      _msgSender(),
      targets,
      values,
      signatures,
      calldatas,
      newProposal.startBlock,
      newProposal.endBlock,
      description
    );
    return newProposal.id;
  }

  /**
   * @notice Queues a proposal of state succeeded
   * @param proposalId The id of the proposal to queue
   */
  function queue(uint256 proposalId) external override {
    require(state(proposalId) == ProposalState.Succeeded, "can only be queued if succeeded");
    Proposal storage proposal = proposals[proposalId];
    uint256 eta = block.timestamp + proposal.delay;
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      require(
        !queuedTransactions[
          keccak256(
            abi.encode(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta)
          )
        ],
        "proposal already queued"
      );
      queueTransaction(
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        eta,
        proposal.delay
      );
    }
    proposal.eta = eta;
    emit ProposalQueued(proposalId, eta);
  }

  function queueTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta,
    uint256 delay
  ) internal returns (bytes32) {
    require(eta >= (getBlockTimestamp() + delay), "must satisfy delay.");

    bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
    queuedTransactions[txHash] = true;

    emit QueueTransaction(txHash, target, value, signature, data, eta);
    return txHash;
  }

  /**
   * @notice Executes a queued proposal if eta has passed
   * @param proposalId The id of the proposal to execute
   */
  function execute(uint256 proposalId) external payable override {
    require(state(proposalId) == ProposalState.Queued, "can only be exec'd if queued");
    Proposal storage proposal = proposals[proposalId];
    proposal.executed = true;
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      this.executeTransaction{value: proposal.values[i]}(
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        proposal.eta
      );
    }
    emit ProposalExecuted(proposalId);
  }

  function executeTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
  ) external payable override returns (bytes memory) {
    bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
    require(queuedTransactions[txHash], "tx hasn't been queued.");
    require(getBlockTimestamp() >= eta, "tx hasn't surpassed timelock.");
    require(getBlockTimestamp() <= eta + GRACE_PERIOD, "tx is stale.");

    queuedTransactions[txHash] = false;

    bytes memory callData;

    if (bytes(signature).length == 0) {
      callData = data;
    } else {
      callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
    }

    // solhint-disable-next-line avoid-low-level-calls
    (bool success, bytes memory returnData) = target.call{value: value}(callData);
    require(success, "tx execution reverted.");

    emit ExecuteTransaction(txHash, target, value, signature, data, eta);

    return returnData;
  }

  /**
   * @notice Cancels a proposal only if sender is the proposer, or proposer delegates dropped below proposal threshold
   * @param proposalId The id of the proposal to cancel
   */
  function cancel(uint256 proposalId) external override {
    require(state(proposalId) != ProposalState.Executed, "cant cancel executed proposal");

    Proposal storage proposal = proposals[proposalId];

    // Proposer can cancel
    if (_msgSender() != proposal.proposer) {
      // Whitelisted proposers can't be canceled for falling below proposal threshold
      if (isWhitelisted(proposal.proposer)) {
        require(
          (ipt.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold) &&
            _msgSender() == whitelistGuardian,
          "cancel: whitelisted proposer"
        );
      } else {
        require(
          (ipt.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold),
          "cancel: proposer above threshold"
        );
      }
    }

    proposal.canceled = true;
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      cancelTransaction(
        proposal.targets[i],
        proposal.values[i],
        proposal.signatures[i],
        proposal.calldatas[i],
        proposal.eta
      );
    }

    emit ProposalCanceled(proposalId);
  }

  function cancelTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
  ) internal {
    bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
    queuedTransactions[txHash] = false;

    emit CancelTransaction(txHash, target, value, signature, data, eta);
  }

  /**
   * @notice Gets actions of a proposal
   * @param proposalId the id of the proposal
   * @return targets proposal targets
   * @return values proposal values
   * @return signatures proposal signatures
   * @return calldatas proposal calldatae
   */
  function getActions(uint256 proposalId)
    external
    view
    override
    returns (
      address[] memory targets,
      uint256[] memory values,
      string[] memory signatures,
      bytes[] memory calldatas
    )
  {
    Proposal storage p = proposals[proposalId];
    return (p.targets, p.values, p.signatures, p.calldatas);
  }

  /**
   * @notice Gets the receipt for a voter on a given proposal
   * @param proposalId the id of proposal
   * @param voter The address of the voter
   * @return The voting receipt
   */
  function getReceipt(uint256 proposalId, address voter) external view override returns (Receipt memory) {
    return proposalReceipts[proposalId][voter];
  }

  /**
   * @notice Gets the state of a proposal
   * @param proposalId The id of the proposal
   * @return Proposal state
   */
  // solhint-disable-next-line code-complexity
  function state(uint256 proposalId) public view override returns (ProposalState) {
    require(proposalCount >= proposalId && proposalId > initialProposalId, "state: invalid proposal id");
    Proposal storage proposal = proposals[proposalId];
    if (proposal.canceled) {
      return ProposalState.Canceled;
    } else if (block.number <= proposal.startBlock) {
      return ProposalState.Pending;
    } else if (block.number <= proposal.endBlock) {
      return ProposalState.Active;
    } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < proposal.quorumVotes) {
      return ProposalState.Defeated;
    } else if (proposal.eta == 0) {
      return ProposalState.Succeeded;
    } else if (proposal.executed) {
      return ProposalState.Executed;
    } else if (block.timestamp >= (proposal.eta + GRACE_PERIOD)) {
      return ProposalState.Expired;
    }
    return ProposalState.Queued;
  }

  /**
   * @notice Cast a vote for a proposal
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   */
  function castVote(uint256 proposalId, uint8 support) external override {
    emit VoteCast(_msgSender(), proposalId, support, castVoteInternal(_msgSender(), proposalId, support), "");
  }

  /**
   * @notice Cast a vote for a proposal with a reason
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   * @param reason The reason given for the vote by the voter
   */
  function castVoteWithReason(
    uint256 proposalId,
    uint8 support,
    string calldata reason
  ) external override {
    emit VoteCast(_msgSender(), proposalId, support, castVoteInternal(_msgSender(), proposalId, support), reason);
  }

  /**
   * @notice Cast a vote for a proposal by signature
   * @dev external override function that accepts EIP-712 signatures for voting on proposals.
   */
  function castVoteBySig(
    uint256 proposalId,
    uint8 support,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    bytes32 domainSeparator = keccak256(
      abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainIdInternal(), address(this))
    );
    bytes32 structHash = keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support));
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    address signatory = ecrecover(digest, v, r, s);
    require(signatory != address(0), "castVoteBySig: invalid signature");
    emit VoteCast(signatory, proposalId, support, castVoteInternal(signatory, proposalId, support), "");
  }

  /**
   * @notice Internal function that caries out voting logic
   * @param voter The voter that is casting their vote
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   * @return The number of votes cast
   */
  function castVoteInternal(
    address voter,
    uint256 proposalId,
    uint8 support
  ) internal returns (uint96) {
    require(state(proposalId) == ProposalState.Active, "voting is closed");
    require(support <= 2, "invalid vote type");
    Proposal storage proposal = proposals[proposalId];
    Receipt storage receipt = proposalReceipts[proposalId][voter];
    require(receipt.hasVoted == false, "voter already voted");
    uint96 votes = ipt.getPriorVotes(voter, proposal.startBlock);

    if (support == 0) {
      proposal.againstVotes = proposal.againstVotes + votes;
    } else if (support == 1) {
      proposal.forVotes = proposal.forVotes + votes;
    } else if (support == 2) {
      proposal.abstainVotes = proposal.abstainVotes + votes;
    }

    receipt.hasVoted = true;
    receipt.support = support;
    receipt.votes = votes;

    return votes;
  }

  /**
   * @notice View function which returns if an account is whitelisted
   * @param account Account to check white list status of
   * @return If the account is whitelisted
   */
  function isWhitelisted(address account) public view override returns (bool) {
    return (whitelistAccountExpirations[account] > block.timestamp);
  }

  /**
   * @notice Used to update the timelock period
   * @param proposalTimelockDelay_ The proposal holding period
   */
  function _setDelay(uint256 proposalTimelockDelay_) public override {
    require(_msgSender() == address(this), "must come from the gov.");
    uint256 oldTimelockDelay = proposalTimelockDelay;
    proposalTimelockDelay = proposalTimelockDelay_;

    emit NewDelay(oldTimelockDelay, proposalTimelockDelay);
  }

  /**
   * @notice Used to update the emergency timelock period
   * @param emergencyTimelockDelay_ The proposal holding period
   */
  function _setEmergencyDelay(uint256 emergencyTimelockDelay_) public override {
    require(_msgSender() == address(this), "must come from the gov.");
    uint256 oldEmergencyTimelockDelay = emergencyTimelockDelay;
    emergencyTimelockDelay = emergencyTimelockDelay_;

    emit NewEmergencyDelay(oldEmergencyTimelockDelay, emergencyTimelockDelay);
  }

  /**
   * @notice Governance function for setting the voting delay
   * @param newVotingDelay new voting delay, in blocks
   */
  function _setVotingDelay(uint256 newVotingDelay) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldVotingDelay = votingDelay;
    votingDelay = newVotingDelay;

    emit VotingDelaySet(oldVotingDelay, votingDelay);
  }

  /**
   * @notice Governance function for setting the voting period
   * @param newVotingPeriod new voting period, in blocks
   */
  function _setVotingPeriod(uint256 newVotingPeriod) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldVotingPeriod = votingPeriod;
    votingPeriod = newVotingPeriod;

    emit VotingPeriodSet(oldVotingPeriod, votingPeriod);
  }

  /**
   * @notice Governance function for setting the emergency voting period
   * @param newEmergencyVotingPeriod new voting period, in blocks
   */
  function _setEmergencyVotingPeriod(uint256 newEmergencyVotingPeriod) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldEmergencyVotingPeriod = emergencyVotingPeriod;
    emergencyVotingPeriod = newEmergencyVotingPeriod;

    emit EmergencyVotingPeriodSet(oldEmergencyVotingPeriod, emergencyVotingPeriod);
  }

  /**
   * @notice Governance function for setting the proposal threshold
   * @param newProposalThreshold new proposal threshold
   */
  function _setProposalThreshold(uint256 newProposalThreshold) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldProposalThreshold = proposalThreshold;
    proposalThreshold = newProposalThreshold;

    emit ProposalThresholdSet(oldProposalThreshold, proposalThreshold);
  }

  /**
   * @notice Governance function for setting the quorum
   * @param newQuorumVotes new proposal quorum
   */
  function _setQuorumVotes(uint256 newQuorumVotes) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldQuorumVotes = quorumVotes;
    quorumVotes = newQuorumVotes;

    emit NewQuorum(oldQuorumVotes, quorumVotes);
  }

  /**
   * @notice Governance function for setting the emergency quorum
   * @param newEmergencyQuorumVotes new proposal quorum
   */
  function _setEmergencyQuorumVotes(uint256 newEmergencyQuorumVotes) external override {
    require(_msgSender() == address(this), "governance only");
    uint256 oldEmergencyQuorumVotes = emergencyQuorumVotes;
    emergencyQuorumVotes = newEmergencyQuorumVotes;

    emit NewEmergencyQuorum(oldEmergencyQuorumVotes, emergencyQuorumVotes);
  }

  /**
   * @notice Governance function for setting the whitelist expiration as a timestamp
   * for an account. Whitelist status allows accounts to propose without meeting threshold
   * @param account Account address to set whitelist expiration for
   * @param expiration Expiration for account whitelist status as timestamp (if now < expiration, whitelisted)
   */
  function _setWhitelistAccountExpiration(address account, uint256 expiration) external override {
    require(_msgSender() == address(this) || _msgSender() == whitelistGuardian, "governance only");
    whitelistAccountExpirations[account] = expiration;

    emit WhitelistAccountExpirationSet(account, expiration);
  }

  /**
   * @notice Governance function for setting the whitelistGuardian. WhitelistGuardian can cancel proposals from whitelisted addresses
   * @param account Account to set whitelistGuardian to (0x0 to remove whitelistGuardian)
   */
  function _setWhitelistGuardian(address account) external override {
    require(_msgSender() == address(this), "governance only");
    address oldGuardian = whitelistGuardian;
    whitelistGuardian = account;

    emit WhitelistGuardianSet(oldGuardian, whitelistGuardian);
  }

  function add256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "addition overflow");
    return c;
  }

  function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "subtraction underflow");
    return a - b;
  }

  function getChainIdInternal() internal view returns (uint256) {
    return block.chainid;
  }

  function getBlockTimestamp() internal view returns (uint256) {
    // solium-disable-next-line security/no-block-members
    return block.timestamp;
  }

  function _msgSender() internal view virtual returns (address) {
    return msg.sender;
  }
}
