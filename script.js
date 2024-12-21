// Import ethers.js
import { ethers } from "https://cdn.ethers.io/lib/ethers-5.2.esm.min.js";

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const navLinks = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('main section');
const searchNFT = document.getElementById('searchNFT');
const nftList = document.getElementById('nftList');
const createNFTForm = document.getElementById('create-nft-form');
const tradePrice = document.getElementById('tradePrice');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const transactionHistory = document.getElementById('transactionHistory').querySelector('tbody');
const walletInfo = document.getElementById('walletInfo');
const portfolioList = document.getElementById('portfolioList');
const totalVolume = document.getElementById('totalVolume');
const uniqueOwners = document.getElementById('uniqueOwners');
const floorPrice = document.getElementById('floorPrice');

// Blockchain related variables
let provider, signer, contract;
const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const contractABI = [
    // Add your contract ABI here
];

// Wallet connection state
let isWalletConnected = false;

// Initialize ethers and connect to the blockchain
async function initializeEthers() {
    try {
        if (window.ethereum) {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            return true;
        } else {
            console.error("Ethereum object not found, install MetaMask.");
            return false;
        }
    } catch (error) {
        console.error("Failed to connect to Ethereum:", error);
        return false;
    }
}

// Connect wallet
connectWalletBtn.addEventListener('click', async () => {
    if (!isWalletConnected) {
        isWalletConnected = await initializeEthers();
    } else {
        isWalletConnected = false;
        provider = null;
        signer = null;
        contract = null;
    }
    updateWalletStatus();
});

// Update wallet status
async function updateWalletStatus() {
    if (isWalletConnected) {
        try {
            const address = await signer.getAddress();
            const balance = await provider.getBalance(address);
            const ethBalance = ethers.utils.formatEther(balance);

            connectWalletBtn.textContent = 'Disconnect Wallet';
            walletInfo.innerHTML = `
                <p><strong>Address:</strong> ${address}</p>
                <p><strong>Balance:</strong> ${ethBalance} ETH</p>
            `;
        } catch (error) {
            console.error("Failed to update wallet status:", error);
            isWalletConnected = false;
            walletInfo.innerHTML = '<p>Failed to fetch wallet info</p>';
        }
    } else {
        connectWalletBtn.textContent = 'Connect Wallet';
        walletInfo.innerHTML = '<p>Wallet not connected</p>';
    }
}

// Create NFT
createNFTForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isWalletConnected) {
        alert('Please connect your wallet first.');
        return;
    }

    const title = document.getElementById('nft-title').value;
    const description = document.getElementById('nft-description').value;
    const price = document.getElementById('nft-price').value;

    try {
        const tokenURI = `data:application/json;base64,${btoa(JSON.stringify({
            name: title,
            description: description,
            image: "https://via.placeholder.com/150" // Replace with actual image URL
        }))}`;

        const tx = await contract.createCourse(tokenURI, ethers.utils.parseEther(price));
        await tx.wait();
        alert('NFT created successfully!');
        await displayNFTs();
    } catch (error) {
        console.error('Error creating NFT:', error);
        alert('Failed to create NFT. Check console for details.');
    }
});

// Display NFTs
async function displayNFTs() {
    if (!isWalletConnected) {
        nftList.innerHTML = '<p>Please connect your wallet to view NFTs.</p>';
        return;
    }

    try {
        nftList.innerHTML = '<p>Loading NFTs...</p>';
        const totalSupply = await contract.totalSupply();
        let nftHtml = '';

        for (let i = 1; i <= totalSupply; i++) {
            const course = await contract.getCourse(i);
            const tokenURI = await contract.tokenURI(i);
            const metadata = JSON.parse(atob(tokenURI.split(',')[1]));

            nftHtml += `
                <div class="nft-card">
                    <img src="${metadata.image}" alt="${metadata.name}">
                    <h3>${metadata.name}</h3>
                    <p>${metadata.description}</p>
                    <p><strong>Price:</strong> ${ethers.utils.formatEther(course.price)} ETH</p>
                    ${course.isListed ? `<button onclick="buyCourse(${i})">Buy</button>` : ''}
                </div>
            `;
        }

        nftList.innerHTML = nftHtml || '<p>No NFTs found.</p>';
    } catch (error) {
        console.error('Error displaying NFTs:', error);
        nftList.innerHTML = '<p>Failed to load NFTs. Please try again.</p>';
    }
}

// Buy NFT
async function buyCourse(tokenId) {
    if (!isWalletConnected) {
        alert('Please connect your wallet first.');
        return;
    }

    try {
        const course = await contract.getCourse(tokenId);
        const tx = await contract.buyCourse(tokenId, { value: course.price });
        await tx.wait();
        alert('Course NFT bought successfully!');
        await displayNFTs();
        updatePortfolio();
    } catch (error) {
        console.error('Error buying NFT:', error);
        alert('Failed to buy NFT. Check console for details.');
    }
}

// Update portfolio
async function updatePortfolio() {
    if (!isWalletConnected) {
        portfolioList.innerHTML = '<p>Please connect your wallet to view your portfolio.</p>';
        return;
    }

    try {
        portfolioList.innerHTML = '<p>Loading portfolio...</p>';
        const address = await signer.getAddress();
        const totalSupply = await contract.totalSupply();
        let portfolioHtml = '';

        for (let i = 1; i <= totalSupply; i++) {
            const owner = await contract.ownerOf(i);
            if (owner === address) {
                const course = await contract.getCourse(i);
                const tokenURI = await contract.tokenURI(i);
                const metadata = JSON.parse(atob(tokenURI.split(',')[1]));

                portfolioHtml += `
                    <div class="nft-card">
                        <img src="${metadata.image}" alt="${metadata.name}">
                        <h3>${metadata.name}</h3>
                        <p>${metadata.description}</p>
                        <p><strong>Price:</strong> ${ethers.utils.formatEther(course.price)} ETH</p>
                        <button onclick="listCourse(${i})">List for Sale</button>
                    </div>
                `;
            }
        }

        portfolioList.innerHTML = portfolioHtml || '<p>You don\'t own any NFTs yet.</p>';
    } catch (error) {
        console.error('Error updating portfolio:', error);
        portfolioList.innerHTML = '<p>Failed to load portfolio. Please try again.</p>';
    }
}

// List course for sale
async function listCourse(tokenId) {
    if (!isWalletConnected) {
        alert('Please connect your wallet first.');
        return;
    }

    const price = prompt("Enter the price in ETH:");
    if (!price) return;

    try {
        const tx = await contract.listCourse(tokenId, ethers.utils.parseEther(price));
        await tx.wait();
        alert('Course listed for sale successfully!');
        updatePortfolio();
        displayNFTs();
    } catch (error) {
        console.error('Error listing course:', error);
        alert('Failed to list course. Check console for details.');
    }
}

// Search NFTs
searchNFT.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.toLowerCase();
    await displayNFTs(searchTerm);
});

// Update analytics
async function updateAnalytics() {
    if (!isWalletConnected) {
        document.querySelector('#analytics .stats-container').innerHTML = '<p>Please connect your wallet to view analytics.</p>';
        return;
    }

    try {
        const totalSupply = await contract.totalSupply();
        let totalVolumeWei = ethers.BigNumber.from(0);
        let uniqueOwnersSet = new Set();
        let floorPriceWei = ethers.constants.MaxUint256;

        for (let i = 1; i <= totalSupply; i++) {
            const course = await contract.getCourse(i);
            const owner = await contract.ownerOf(i);

            totalVolumeWei = totalVolumeWei.add(course.price);
            uniqueOwnersSet.add(owner);

            if (course.isListed && course.price.lt(floorPriceWei)) {
                floorPriceWei = course.price;
            }
        }

        totalVolume.textContent = `${ethers.utils.formatEther(totalVolumeWei)} ETH`;
        uniqueOwners.textContent = uniqueOwnersSet.size;
        floorPrice.textContent = floorPriceWei.eq(ethers.constants.MaxUint256) 
            ? 'N/A' 
            : `${ethers.utils.formatEther(floorPriceWei)} ETH`;

        // You can add more complex analytics here, such as price history charts
    } catch (error) {
        console.error('Error updating analytics:', error);
        document.querySelector('#analytics .stats-container').innerHTML = '<p>Failed to load analytics. Please try again.</p>';
    }
}

// Tab switching
document.querySelector('nav').addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').slice(1);
        switchTab(targetId);
    }
});

function switchTab(targetId) {
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${targetId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    sections.forEach(section => {
        if (section.id === targetId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Load tab-specific content
    switch (targetId) {
        case 'marketplace':
            displayNFTs();
            break;
        case 'trading':
            // Implement trading functionality
            break;
        case 'portfolio':
            updatePortfolio();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'wallet':
            updateWalletStatus();
            break;
    }
}

// Initial setup
window.addEventListener('load', async () => {
    if (await initializeEthers()) {
        isWalletConnected = true;
        updateWalletStatus();
    }
    switchTab('marketplace');
});

// Make functions global for onclick events
window.buyCourse = buyCourse;
window.listCourse = listCourse;

