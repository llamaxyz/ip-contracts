// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../IOracleRelay.sol";
import "../../_external/IERC20.sol";
import "../../_external/balancer/IBalancerVault.sol";

import "hardhat/console.sol";

interface IBalancerPool {
  function getPoolId() external view returns (bytes32);

  function totalSupply() external view returns (uint256);

  function getLastInvariant() external view returns (uint256, uint256);

  function getRate() external view returns (uint256);

  //metaStablePool only
  function getOracleMiscData()
    external
    view
    returns (
      int256 loutGivenInnvariant,
      int256 logTotalSupply,
      uint256 oracleSampleCreationTimestamp,
      uint256 oracleIndex,
      bool oracleEnabled
    );
}

/*****************************************
 *
 * This relay gets a USD price for BPT LP token from a balancer MetaStablePool
 * This can be used as a stand alone oracle as the price is checked 2 separate ways
 *
 */

contract BPTstablePoolOracle is IOracleRelay {
  bytes32 public immutable _poolId;

  uint256 public immutable _widthNumerator;
  uint256 public immutable _widthDenominator;

  IBalancerPool public immutable _priceFeed;

  mapping(address => IOracleRelay) public assetOracles;

  //Balancer Vault
  IBalancerVault public immutable VAULT; // = IBalancerVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

  /**
   * @param pool_address - Balancer StablePool or MetaStablePool address
   */
  constructor(
    address pool_address,
    IBalancerVault balancerVault,
    address[] memory _tokens,
    address[] memory _oracles,
    uint256 widthNumerator,
    uint256 widthDenominator
  ) {
    _priceFeed = IBalancerPool(pool_address);

    _poolId = _priceFeed.getPoolId();

    VAULT = balancerVault;

    registerOracles(_tokens, _oracles);

    _widthNumerator = widthNumerator;
    _widthDenominator = widthDenominator;
  }

  function currentValue() external view override returns (uint256) {
    (IERC20[] memory tokens, uint256[] memory balances /**uint256 lastChangeBlock */, ) = VAULT.getPoolTokens(_poolId);

    //simulate manipulation
    //uint256[] memory manipulated = manipulateBalances(tokens, balances, 10000e18);

    uint256 tokenAmountIn = 1000e18;

    uint256 outGivenIn = compareOutGivenIn(balances, tokenAmountIn);

    (uint256 calcedRate, uint256 expectedRate) = getOutGivenInExchangeRate(
      outGivenIn,
      tokenAmountIn,
      assetOracles[address(tokens[0])].currentValue(),
      assetOracles[address(tokens[1])].currentValue()
    );

    verifyExchangeRate(expectedRate, calcedRate);

    uint256 naivePrice = getNaivePrice(tokens, balances);

    return naivePrice;
  }

  /*******************************GET & CHECK NAIVE PRICE********************************/
  function getNaivePrice(IERC20[] memory tokens, uint256[] memory balances) internal view returns (uint256 naivePrice) {
    uint256 naiveValue = sumBalances(tokens, balances);
    naivePrice = naiveValue / _priceFeed.totalSupply();
    require(naivePrice > 0, "invalid naive price");
  }

  /*******************************OUT GIVEN IN********************************/
  function compareOutGivenIn(
    uint256[] memory balances,
    uint256 tokenAmountIn
  ) internal view returns (uint256 outGivenIn) {
    (uint256 v, uint256 amp) = _priceFeed.getLastInvariant();
    uint256 idxIn = 0;
    uint256 idxOut = 1;
    uint256[] memory calcedBalances = new uint256[](2);
    calcedBalances[0] = _getTokenBalanceGivenInvariantAndAllOtherBalances(amp, balances, v, 0);

    calcedBalances[1] = _getTokenBalanceGivenInvariantAndAllOtherBalances(amp, balances, v, 1);
    uint256 finalBalanceOut = _calcOutGivenIn(amp, calcedBalances, idxIn, idxOut, tokenAmountIn, v);

    outGivenIn = sub(sub(balances[idxOut], finalBalanceOut), 1);
  }

  function percentChange(uint256 a, uint256 b) internal pure returns (uint256 delta) {
    uint256 max = a > b ? a : b;
    uint256 min = b != max ? b : a;
    delta = divide((max - min), min, 18);
  }

  ///@notice ensure the exchange rate is within the expected range
  ///@notice ensuring the price is in bounds prevents price manipulation
  function verifyExchangeRate(uint256 expectedRate, uint256 outGivenInRate) internal view {
    uint256 delta = percentChange(expectedRate, outGivenInRate);
    uint256 buffer = divide(_widthNumerator, _widthDenominator, 18);

    require(delta < buffer, "Price out of bounds");
  }

  function getSimpleExchangeRate(uint256 price0, uint256 price1) internal pure returns (uint256 expectedRate) {
    expectedRate = divide(price1, price0, 18);
  }

  function getOutGivenInExchangeRate(
    uint256 outGivenIn,
    uint256 tokenAmountIn,
    uint256 price0,
    uint256 price1
  ) internal pure returns (uint256 calcedRate, uint256 expectedRate) {
    expectedRate = getSimpleExchangeRate(price0, price1);

    uint256 numerator = divide(outGivenIn * price1, 1e18, 18);

    uint256 denominator = divide((tokenAmountIn * price0), 1e18, 18);

    calcedRate = divide(numerator, denominator, 18);
  }

  // Computes how many tokens can be taken out of a pool if `tokenAmountIn` are sent, given the current balances.
  // The amplification parameter equals: A n^(n-1)
  // The invariant should be rounded up.
  function _calcOutGivenIn(
    uint256 amplificationParameter,
    uint256[] memory balances,
    uint256 tokenIndexIn,
    uint256 tokenIndexOut,
    uint256 tokenAmountIn,
    uint256 invariant
  ) internal pure returns (uint256) {
    /**************************************************************************************************************
        // outGivenIn token x for y - polynomial equation to solve                                                   //
        // ay = amount out to calculate                                                                              //
        // by = balance token out                                                                                    //
        // y = by - ay (finalBalanceOut)                                                                             //
        // D = invariant                                               D                     D^(n+1)                 //
        // A = amplification coefficient               y^2 + ( S - ----------  - D) * y -  ------------- = 0         //
        // n = number of tokens                                    (A * n^n)               A * n^2n * P              //
        // S = sum of final balances but y                                                                           //
        // P = product of final balances but y                                                                       //
        **************************************************************************************************************/

    balances[tokenIndexIn] = balances[tokenIndexIn] + (tokenAmountIn);

    uint256 finalBalanceOut = _getTokenBalanceGivenInvariantAndAllOtherBalances(
      amplificationParameter,
      balances,
      invariant,
      tokenIndexOut
    );
    balances[tokenIndexIn] = balances[tokenIndexIn] - tokenAmountIn;
    return finalBalanceOut;
    /**
    if (balances[tokenIndexOut] > finalBalanceOut) {
      return sub(sub(balances[tokenIndexOut], finalBalanceOut), 1);
    } else {
      return 0;
    }
     */
  }

  // This function calculates the balance of a given token (tokenIndex)
  // given all the other balances and the invariant
  function _getTokenBalanceGivenInvariantAndAllOtherBalances(
    uint256 amplificationParameter,
    uint256[] memory balances,
    uint256 invariant,
    uint256 tokenIndex
  ) internal pure returns (uint256) {
    // Rounds result up overall
    uint256 _AMP_PRECISION = 1e3;

    uint256 ampTimesTotal = amplificationParameter * balances.length;
    uint256 sum = balances[0];
    uint256 P_D = balances[0] * balances.length;
    for (uint256 j = 1; j < balances.length; j++) {
      P_D = divDown(mul(mul(P_D, balances[j]), balances.length), invariant);
      sum = add(sum, balances[j]);
    }
    // No need to use safe math, based on the loop above `sum` is greater than or equal to `balances[tokenIndex]`
    sum = sum - balances[tokenIndex];

    uint256 inv2 = mul(invariant, invariant);
    // We remove the balance from c by multiplying it
    uint256 c = mul(mul(divUp(inv2, mul(ampTimesTotal, P_D)), _AMP_PRECISION), balances[tokenIndex]);
    uint256 b = sum + mul(divDown(invariant, ampTimesTotal), _AMP_PRECISION);

    // We iterate to find the balance
    uint256 prevTokenBalance = 0;
    // We multiply the first iteration outside the loop with the invariant to set the value of the
    // initial approximation.
    uint256 tokenBalance = divUp(add(inv2, c), add(invariant, b));

    for (uint256 i = 0; i < 255; i++) {
      prevTokenBalance = tokenBalance;

      //tokenBalance = divUp(add(mul(tokenBalance, tokenBalance), c), sub(add(mul(tokenBalance, 2), b), invariant));

      uint256 numerator = (tokenBalance * tokenBalance) + c;
      uint256 denominator = ((tokenBalance * 2) + b) - invariant;

      tokenBalance = divUp(numerator, denominator);
      if (tokenBalance > prevTokenBalance) {
        if (tokenBalance - prevTokenBalance <= 1) {
          return tokenBalance;
        }
      } else if (prevTokenBalance - tokenBalance <= 1) {
        return tokenBalance;
      }
    }
    revert("STABLE_GET_BALANCE_DIDNT_CONVERGE");
  }

  function divUp(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0, "divUp: Zero division");

    if (a == 0) {
      return 0;
    } else {
      return 1 + (a - 1) / b;
    }
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a * b;
    require(a == 0 || c / a == b, "mul: overflow");
    return c;
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "ADD_OVERFLOW");
    return c;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "SUB_OVERFLOW");
    uint256 c = a - b;
    return c;
  }

  /*******************************CALCULATE BPT OUT********************************/
  function calcBptOut(
    IERC20[] memory tokens,
    uint256[] memory _balances,
    uint256 amp
  ) internal view returns (uint256 output) {
    //simulate a huge swap
    //_balances = manipulateBalances(_balances, 14000e18);

    uint256 currentV = _calculateInvariant(amp, _balances);
    uint256 factor = 20;

    _balances[0] = _balances[0] + 10 ** factor;
    _balances[1] = _balances[1] + 10 ** factor;

    uint256 newInvariant = _calculateInvariant(amp, _balances);

    uint256 invariantRatio = divide(newInvariant, currentV, 18);

    uint256 result = mulDown(_priceFeed.totalSupply(), (invariantRatio - 1e18));

    //price0 + price1
    uint256 numerator = assetOracles[address(tokens[0])].currentValue() +
      assetOracles[address(tokens[1])].currentValue();

    output = divide(numerator, result, factor);
  }

  function manipulateBalances(
    uint256[] memory balances,
    uint256 tokenAmountIn
  ) internal view returns (uint256[] memory manipulatedBalances) {
    manipulatedBalances = new uint256[](2);

    //simulate balance change after gigantic swap
    manipulatedBalances[0] = balances[0] - tokenAmountIn;
    manipulatedBalances[1] = balances[1] + compareOutGivenIn(balances, tokenAmountIn);
  }

  ///@notice The invariant should be resistant to changes in the pool balances due to swaps
  ///@notice The invariant should scale with the total supply of LP tokens
  function _calculateInvariant(
    uint256 amplificationParameter,
    uint256[] memory balances
  ) internal pure returns (uint256) {
    uint256 _AMP_PRECISION = 1e3;
    /**********************************************************************************************
        // invariant                                                                                 //
        // D = invariant                                                  D^(n+1)                    //
        // A = amplification coefficient      A  n^n S + D = A D n^n + -----------                   //
        // S = sum of balances                                             n^n P                     //
        // P = product of balances                                                                   //
        // n = number of tokens                                                                      //
        **********************************************************************************************/

    // Always round down, to match Vyper's arithmetic (which always truncates).

    uint256 sum = 0; // S in the Curve version
    uint256 numTokens = balances.length;
    for (uint256 i = 0; i < numTokens; i++) {
      sum = sum + (balances[i]);
    }
    if (sum == 0) {
      return 0;
    }

    uint256 prevInvariant; // Dprev in the Curve version
    uint256 invariant = sum; // D in the Curve version
    uint256 ampTimesTotal = amplificationParameter * numTokens; // Ann in the Curve version

    for (uint256 i = 0; i < 255; i++) {
      uint256 D_P = invariant;

      for (uint256 j = 0; j < numTokens; j++) {
        // (D_P * invariant) / (balances[j] * numTokens)
        D_P = divDown((D_P * invariant), (balances[j] * numTokens));
      }

      prevInvariant = invariant;

      invariant = divDown(
        // (ampTimesTotal * sum) / AMP_PRECISION + D_P * numTokens
        ((divDown((ampTimesTotal * sum), _AMP_PRECISION) + ((D_P * numTokens))) * invariant),
        // ((ampTimesTotal - _AMP_PRECISION) * invariant) / _AMP_PRECISION + (numTokens + 1) * D_P
        (divDown(((ampTimesTotal - _AMP_PRECISION) * invariant), _AMP_PRECISION) + (((numTokens + 1) * D_P)))
      );

      if (invariant > prevInvariant) {
        if (invariant - prevInvariant <= 1) {
          return invariant;
        }
      } else if (prevInvariant - invariant <= 1) {
        return invariant;
      }
    }

    revert("STABLE_INVARIANT_DIDNT_CONVERGE");
  }

  /*******************************SETUP FUNCTIONS********************************/
  function sumBalances(IERC20[] memory tokens, uint256[] memory balances) internal view returns (uint256 total) {
    total = 0;
    for (uint256 i = 0; i < tokens.length; i++) {
      total += ((assetOracles[address(tokens[i])].currentValue() * balances[i]));
    }
  }

  function registerOracles(address[] memory _tokens, address[] memory _oracles) internal {
    for (uint256 i = 0; i < _tokens.length; i++) {
      assetOracles[_tokens[i]] = IOracleRelay(_oracles[i]);
    }
  }

  /*******************************PURE MATH FUNCTIONS********************************/
  function mulDown(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 product = a * b;
    require(a == 0 || product / a == b, "overflow");

    return product / 1e18;
  }

  function divDown(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0, "divDown: Zero division");
    return a / b;
  }

  function divide(uint256 numerator, uint256 denominator, uint256 factor) internal pure returns (uint256 result) {
    uint256 q = (numerator / denominator) * 10 ** factor;
    uint256 r = ((numerator * 10 ** factor) / denominator) % 10 ** factor;

    return q + r;
  }
}
