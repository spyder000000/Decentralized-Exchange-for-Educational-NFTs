// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CourseNFTMarketplace is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    uint256 public listingFee = 0.025 ether;

    struct CourseItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
    }

    mapping(uint256 => CourseItem) private idToCourseItem;

    event CourseItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    constructor() ERC721("CourseNFT", "CNFT") Ownable(msg.sender) {}

    function getListingFee() public view returns (uint256) {
        return listingFee;
    }

    function setListingFee(uint256 _listingFee) public onlyOwner {
        listingFee = _listingFee;
    }

    function createCourseItem(string memory tokenURI, uint256 price) public payable nonReentrant {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingFee, "Price must be equal to listing fee");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        idToCourseItem[newTokenId] = CourseItem(
            newTokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false
        );

        _transfer(msg.sender, address(this), newTokenId);

        emit CourseItemCreated(
            newTokenId,
            msg.sender,
            address(this),
            price,
            false
        );
    }

    function createCourseSale(uint256 tokenId) public payable nonReentrant {
        CourseItem storage item = idToCourseItem[tokenId];
        uint256 price = item.price;
        address seller = item.seller;

        require(msg.value == price, "Please submit the asking price in order to complete the purchase");
        require(item.owner == address(this), "Item is not for sale");

        item.owner = payable(msg.sender);
        item.sold = true;
        item.seller = payable(address(0));
        _itemsSold.increment();

        _transfer(address(this), msg.sender, tokenId);
        payable(owner()).transfer(listingFee);
        payable(seller).transfer(msg.value - listingFee);
    }

    function fetchCourseItems() public view returns (CourseItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;

        CourseItem[] memory items = new CourseItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (idToCourseItem[i + 1].owner == address(this)) {
                uint256 currentId = i + 1;
                CourseItem storage currentItem = idToCourseItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchMyCourseItems() public view returns (CourseItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToCourseItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }

        CourseItem[] memory items = new CourseItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToCourseItem[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                CourseItem storage currentItem = idToCourseItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchItemsCreated() public view returns (CourseItem[] memory) {
        uint256 totalItemCount = _tokenIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToCourseItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        CourseItem[] memory items = new CourseItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToCourseItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                CourseItem storage currentItem = idToCourseItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}