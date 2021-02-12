pragma solidity 0.6.0;

interface IUniswap{
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline) 
    external returns (uint[] memory amounts);

    function swapExactETHForTokens(
        uint amountOutMin, 
        address[] calldata path, 
        address to, 
        uint deadline)
    external payable returns (uint[] memory amounts);
    
    function getAmountsOut(
        uint amountIn, 
        address[] calldata path) 
    external view returns (uint[] memory amounts);

}

interface IERC20 {
    
    function transferFrom(
        address sender, 
        address recipient, 
        uint256 amount) external returns (bool);

    function approve(
        address spender, 
        uint256 amount) external returns (bool);
        
    function permit(
        address holder, 
        address spender, 
        uint256 nonce, 
        uint256 expiry,
        bool allowed, 
        uint8 v, 
        bytes32 r, 
        bytes32 s) external;
        
    function transfer(
        address dst, 
        uint wad) external returns (bool);

}

contract Swapper {
    address public owner;
    uint public a;
    address public exchangeAddress;
    event ErrorHandled(string reason);

    constructor() public {
        owner = msg.sender;
        exchangeAddress = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        IERC20(0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa).approve(exchangeAddress, uint256(-1));
    }
    
    function getPermit(
        address _token, 
        address _holder, 
        address _spender, 
        uint256 _nonce, 
        uint256 _expiry, 
        bool _allowed,
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s) internal returns(bool){
            IERC20(_token).permit(
                _holder,
                _spender,
                _nonce,
                _expiry,
                _allowed,
                _v,
                _r,
                _s);
                
            return true;
        }
    
    
    function getAmounts (address[] memory path, uint256 _amount) public view returns(uint256[] memory){
        uint256[] memory amounts = IUniswap(exchangeAddress).getAmountsOut(_amount, path);
        return amounts;
    }
    
    function approveUniswap(address _token) external {
        IERC20(_token).approve(exchangeAddress, uint256(-1));
    }
    
    function swapWithPermit(
        bool _withPermit,
        address _token, 
        address _holder, 
        uint256 _nonce, 
        uint256 _expiry, 
        bool _allowed,
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s,
        uint256 _amount,
        address _outToken,
        uint256 _tokenFee) external {
        
        if(_withPermit){
            getPermit(_token, _holder, address(this), _nonce, _expiry, _allowed, _v, _r, _s);
        }
        
        IERC20(_token).transferFrom(_holder, address(this), _amount);
    
        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = _outToken;
        uint deadline = 1644562445;
        
        uint256[] memory amounts = IUniswap(exchangeAddress).getAmountsOut(_amount, path);
        
        uint256 [] memory amountAfterSwap = IUniswap(exchangeAddress).swapExactTokensForTokens(
            _amount,
            amounts[1],
            path,
            address(this),
            deadline
        );
        
        IERC20(_outToken).transfer(_holder, amountAfterSwap[1] - _tokenFee);
    
    }
}
