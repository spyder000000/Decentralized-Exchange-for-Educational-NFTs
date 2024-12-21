// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CourseNFTDEX is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    struct Course {
        string title;
        string description;
        uint256 duration;
        bool verified;
    }

    // Mapping from NFT contract address => token ID => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    
    // Mapping for course details
    mapping(address => mapping(uint256 => Course)) public courses;
    
    // Platform fee percentage (0.5%)
    uint256 public platformFeePercent = 50; // Base 10000
    
    // Events
    event Listed(address indexed nftContract, uint256 indexed tokenId, address seller, uint256 price);
    event Sale(address indexed nftContract, uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event ListingCanceled(address indexed nftContract, uint256 indexed tokenId, address seller);
    event CourseVerified(address indexed nftContract, uint256 indexed tokenId);
    event PlatformFeeUpdated(uint256 newFee);

    constructor() Ownable(msg.sender) {}

    function listCourseNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        string memory title,
        string memory description,
        uint256 duration
    ) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not the owner");
        require(IERC721(nftContract).getApproved(tokenId) == address(this), "DEX not approved");

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        courses[nftContract][tokenId] = Course({
            title: title,
            description: description,
            duration: duration,
            verified: false
        });

        emit Listed(nftContract, tokenId, msg.sender, price);
    }

    function buyCourseNFT(address nftContract, uint256 tokenId) external payable nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.active, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        uint256 platformFee = listing.price.mul(platformFeePercent).div(10000);
        uint256 sellerAmount = listing.price.sub(platformFee);

        // Transfer NFT to buyer
        IERC721(nftContract).safeTransferFrom(listing.seller, msg.sender, tokenId);

        // Transfer funds to seller
        payable(listing.seller).transfer(sellerAmount);

        // Update listing status
        listing.active = false;

        emit Sale(nftContract, tokenId, listing.seller, msg.sender, listing.price);

        // Refund excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
    }

    function cancelListing(address nftContract, uint256 tokenId) external nonReentrant {
        Listing storage listing = listings[nftContract][tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.active, "Listing not active");

        listing.active = false;
        emit ListingCanceled(nftContract, tokenId, msg.sender);
    }

    function verifyCourse(address nftContract, uint256 tokenId) external onlyOwner {
        Course storage course = courses[nftContract][tokenId];
        course.verified = true;
        emit CourseVerified(nftContract, tokenId);
    }

    function updatePlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }

    // View functions
    function getListing(address nftContract, uint256 tokenId) external view returns (Listing memory) {
        return listings[nftContract][tokenId];
    }

    function getCourse(address nftContract, uint256 tokenId) external view returns (Course memory) {
        return courses[nftContract][tokenId];
    }
}