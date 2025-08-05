// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract RektConfessionNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    struct Confession {
        string text;
        address confessee;
        uint256 timestamp;
        uint256 votes;
    }
    
    mapping(uint256 => Confession) public confessions;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    event ConfessionMinted(uint256 indexed tokenId, address indexed confessee, string confession);
    event ConfessionVoted(uint256 indexed tokenId, address indexed voter, uint256 newVoteCount);
    
    constructor() ERC721("REKT Confession", "REKT") {}
    
    function mint(address to, string memory confession, string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        confessions[tokenId] = Confession({
            text: confession,
            confessee: to,
            timestamp: block.timestamp,
            votes: 0
        });
        
        emit ConfessionMinted(tokenId, to, confession);
        return tokenId;
    }
    
    function voteOnConfession(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(!hasVoted[tokenId][msg.sender], "Already voted");
        require(ownerOf(tokenId) != msg.sender, "Cannot vote on own confession");
        
        hasVoted[tokenId][msg.sender] = true;
        confessions[tokenId].votes++;
        
        emit ConfessionVoted(tokenId, msg.sender, confessions[tokenId].votes);
    }
    
    function getConfession(uint256 tokenId) public view returns (Confession memory) {
        require(_exists(tokenId), "Token does not exist");
        return confessions[tokenId];
    }
    
    function getTotalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }
    
    function getAllConfessions() public view returns (Confession[] memory) {
        uint256 totalSupply = _tokenIdCounter.current();
        Confession[] memory allConfessions = new Confession[](totalSupply);
        
        for (uint256 i = 0; i < totalSupply; i++) {
            allConfessions[i] = confessions[i];
        }
        
        return allConfessions;
    }
    
    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
