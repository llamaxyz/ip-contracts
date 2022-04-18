/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "../../common";

export interface VaultInterface extends utils.Interface {
  functions: {
    "BaseLiability()": FunctionFragment;
    "Minter()": FunctionFragment;
    "_VaultControllerAddress()": FunctionFragment;
    "_baseLiability()": FunctionFragment;
    "_id()": FunctionFragment;
    "_minter()": FunctionFragment;
    "decrease_liability(uint256)": FunctionFragment;
    "delegateCompLikeTo(address,address)": FunctionFragment;
    "increase_liability(uint256)": FunctionFragment;
    "masterTransfer(address,address,uint256)": FunctionFragment;
    "tokenBalance(address)": FunctionFragment;
    "withdrawErc20(address,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "BaseLiability"
      | "Minter"
      | "_VaultControllerAddress"
      | "_baseLiability"
      | "_id"
      | "_minter"
      | "decrease_liability"
      | "delegateCompLikeTo"
      | "increase_liability"
      | "masterTransfer"
      | "tokenBalance"
      | "withdrawErc20"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "BaseLiability",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "Minter", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "_VaultControllerAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "_baseLiability",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "_id", values?: undefined): string;
  encodeFunctionData(functionFragment: "_minter", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "decrease_liability",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "delegateCompLikeTo",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "increase_liability",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "masterTransfer",
    values: [string, string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "tokenBalance",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawErc20",
    values: [string, BigNumberish]
  ): string;

  decodeFunctionResult(
    functionFragment: "BaseLiability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "Minter", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "_VaultControllerAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_baseLiability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "_id", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "_minter", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "decrease_liability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "delegateCompLikeTo",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "increase_liability",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "masterTransfer",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "tokenBalance",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawErc20",
    data: BytesLike
  ): Result;

  events: {
    "Deposit(address,uint256)": EventFragment;
    "Withdraw(address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Deposit"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Withdraw"): EventFragment;
}

export interface DepositEventObject {
  token_address: string;
  amount: BigNumber;
}
export type DepositEvent = TypedEvent<[string, BigNumber], DepositEventObject>;

export type DepositEventFilter = TypedEventFilter<DepositEvent>;

export interface WithdrawEventObject {
  token_address: string;
  amount: BigNumber;
}
export type WithdrawEvent = TypedEvent<
  [string, BigNumber],
  WithdrawEventObject
>;

export type WithdrawEventFilter = TypedEventFilter<WithdrawEvent>;

export interface Vault extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: VaultInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    BaseLiability(overrides?: CallOverrides): Promise<[BigNumber]>;

    Minter(overrides?: CallOverrides): Promise<[string]>;

    _VaultControllerAddress(overrides?: CallOverrides): Promise<[string]>;

    _baseLiability(overrides?: CallOverrides): Promise<[BigNumber]>;

    _id(overrides?: CallOverrides): Promise<[BigNumber]>;

    _minter(overrides?: CallOverrides): Promise<[string]>;

    decrease_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    delegateCompLikeTo(
      compLikeDelegatee: string,
      CompLikeToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    increase_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    masterTransfer(
      _token: string,
      _to: string,
      _amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    tokenBalance(addr: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    withdrawErc20(
      token_address: string,
      amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  BaseLiability(overrides?: CallOverrides): Promise<BigNumber>;

  Minter(overrides?: CallOverrides): Promise<string>;

  _VaultControllerAddress(overrides?: CallOverrides): Promise<string>;

  _baseLiability(overrides?: CallOverrides): Promise<BigNumber>;

  _id(overrides?: CallOverrides): Promise<BigNumber>;

  _minter(overrides?: CallOverrides): Promise<string>;

  decrease_liability(
    base_amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  delegateCompLikeTo(
    compLikeDelegatee: string,
    CompLikeToken: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  increase_liability(
    base_amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  masterTransfer(
    _token: string,
    _to: string,
    _amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  tokenBalance(addr: string, overrides?: CallOverrides): Promise<BigNumber>;

  withdrawErc20(
    token_address: string,
    amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    BaseLiability(overrides?: CallOverrides): Promise<BigNumber>;

    Minter(overrides?: CallOverrides): Promise<string>;

    _VaultControllerAddress(overrides?: CallOverrides): Promise<string>;

    _baseLiability(overrides?: CallOverrides): Promise<BigNumber>;

    _id(overrides?: CallOverrides): Promise<BigNumber>;

    _minter(overrides?: CallOverrides): Promise<string>;

    decrease_liability(
      base_amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    delegateCompLikeTo(
      compLikeDelegatee: string,
      CompLikeToken: string,
      overrides?: CallOverrides
    ): Promise<void>;

    increase_liability(
      base_amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    masterTransfer(
      _token: string,
      _to: string,
      _amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    tokenBalance(addr: string, overrides?: CallOverrides): Promise<BigNumber>;

    withdrawErc20(
      token_address: string,
      amount: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "Deposit(address,uint256)"(
      token_address?: null,
      amount?: null
    ): DepositEventFilter;
    Deposit(token_address?: null, amount?: null): DepositEventFilter;

    "Withdraw(address,uint256)"(
      token_address?: null,
      amount?: null
    ): WithdrawEventFilter;
    Withdraw(token_address?: null, amount?: null): WithdrawEventFilter;
  };

  estimateGas: {
    BaseLiability(overrides?: CallOverrides): Promise<BigNumber>;

    Minter(overrides?: CallOverrides): Promise<BigNumber>;

    _VaultControllerAddress(overrides?: CallOverrides): Promise<BigNumber>;

    _baseLiability(overrides?: CallOverrides): Promise<BigNumber>;

    _id(overrides?: CallOverrides): Promise<BigNumber>;

    _minter(overrides?: CallOverrides): Promise<BigNumber>;

    decrease_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    delegateCompLikeTo(
      compLikeDelegatee: string,
      CompLikeToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    increase_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    masterTransfer(
      _token: string,
      _to: string,
      _amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    tokenBalance(addr: string, overrides?: CallOverrides): Promise<BigNumber>;

    withdrawErc20(
      token_address: string,
      amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    BaseLiability(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    Minter(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    _VaultControllerAddress(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    _baseLiability(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    _id(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    _minter(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    decrease_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    delegateCompLikeTo(
      compLikeDelegatee: string,
      CompLikeToken: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    increase_liability(
      base_amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    masterTransfer(
      _token: string,
      _to: string,
      _amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    tokenBalance(
      addr: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    withdrawErc20(
      token_address: string,
      amount: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}
