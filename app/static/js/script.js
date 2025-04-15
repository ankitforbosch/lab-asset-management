// Configuration
const config = {
    apiBaseUrl: window.location.origin
};

// Global State
let assets = [];
let transactions = [];
let cart = [];
let selectedReturnItems = [];

// DOM Elements
const itemsModal = new bootstrap.Modal('#itemsModal');
const cartModal = new bootstrap.Modal('#cartModal');
const addEquipmentModal = new bootstrap.Modal('#addEquipmentModal');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    showView('dashboard');
});

// Data Loading
async function loadData() {
    try {
        showLoading(true);
        const [assetsResponse, transactionsResponse] = await Promise.all([
            fetch(`${config.apiBaseUrl}/api/assets`),
            fetch(`${config.apiBaseUrl}/api/transactions`)
        ]);
        
        assets = await assetsResponse.json();
        transactions = await transactionsResponse.json();
        
        updateDashboard();
    } catch (error) {
        console.error("Failed to load data:", error);
        alert("Failed to load data. Please refresh the page.");
    } finally {
        showLoading(false);
    }
}

// Dashboard Functions
function updateDashboard() {
    document.getElementById('available-count').textContent = 
        assets.filter(a => a.Status === 'Available').length;
    
    document.getElementById('borrowed-count').textContent = 
        assets.filter(a => a.Status === 'Borrowed').length;
    
    document.getElementById('maintenance-count').textContent = 
        assets.filter(a => a.Status === 'Under Maintenance').length;
}

// View Management
function showView(viewName) {
    document.querySelectorAll('.view-container').forEach(view => {
        view.classList.remove('active');
    });
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(`${viewName}View`).classList.add('active');
    document.querySelector(`.nav-link[onclick="showView('${viewName}')"]`).classList.add('active');
    
    if (viewName === 'history') {
        renderHistoryLog();
    }
}

// Item Modal Functions
function showItemsModal(status) {
    const filteredItems = assets.filter(item => item.Status === status);
    document.getElementById('itemsModalTitle').textContent = `${status} Items (${filteredItems.length})`;
    
    const modalBody = document.getElementById('itemsModalBody');
    modalBody.innerHTML = '';
    
    if (filteredItems.length === 0) {
        modalBody.innerHTML = `<div class="alert alert-info">No ${status.toLowerCase()} items found</div>`;
        itemsModal.show();
        return;
    }

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'equipment-card';
        card.innerHTML = `
            <h5>${item.EquipmentName}</h5>
            <p><strong>ID:</strong> ${item.EquipmentID}</p>
            <p><strong>Serial:</strong> ${item.SerialNumber}</p>
            <p><strong>Status:</strong> ${item.Status}</p>
            <div class="barcode-container">
                <svg class="barcode" id="barcode-${item.EquipmentID}"></svg>
            </div>
            ${status === 'Available' ? `
            <div class="quantity-control mt-3">
                <button class="btn btn-sm btn-primary w-100" onclick="addToCart('${item.EquipmentID}')">
                    <i class="bi bi-cart-plus"></i> Add to Cart
                </button>
            </div>
            ` : ''}
        `;
        modalBody.appendChild(card);
        
        JsBarcode(`#barcode-${item.EquipmentID}`, item.EquipmentID, {
            format: "CODE128",
            lineColor: "#000",
            width: 1.5,
            height: 40,
            displayValue: false
        });
    });
    
    itemsModal.show();
}

// Cart System Functions
function addToCart(equipmentId) {
    const equipment = assets.find(item => item.EquipmentID === equipmentId);
    cart.push(equipment);
    updateCartUI();
    itemsModal.hide();
}

function updateCartUI() {
    document.getElementById('cartBadge').textContent = cart.length;
    
    const cartItemsList = document.getElementById('cartItemsList');
    cartItemsList.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsList.innerHTML = '<div class="alert alert-info">Your cart is empty</div>';
        return;
    }
    
    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'mb-3 p-3 border rounded';
        cartItem.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <h6>${item.EquipmentName}</h6>
                    <small class="text-muted">${item.EquipmentID}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        cartItemsList.appendChild(cartItem);
    });
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function clearCart() {
    cart = [];
    updateCartUI();
    cartModal.hide();
}

function showCartModal() {
    updateCartUI();
    cartModal.show();
}

// Borrow Process
async function processBorrow() {
    const borrowerId = document.getElementById('borrowerId').value.trim();
    const expectedReturn = document.getElementById('expectedReturn').value;
    const purpose = document.getElementById('borrowPurpose').value.trim();
    
    if (!borrowerId || !expectedReturn || cart.length === 0) {
        alert("Please fill all required fields");
        return;
    }
    
    try {
        showLoading(true);
        
        for (const item of cart) {
            const response = await fetch(`${config.apiBaseUrl}/api/transactions/borrow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipment_id: item.EquipmentID,
                    borrower_ntid: borrowerId,
                    expected_return: expectedReturn,
                    purpose: purpose
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to process borrowing');
            }
        }
        
        cart = [];
        updateCartUI();
        await loadData();
        
        cartModal.hide();
        alert("Equipment borrowed successfully!");
    } catch (error) {
        console.error("Borrow failed:", error);
        alert("Failed to process borrowing. Please try again.");
    } finally {
        showLoading(false);
    }
}

// Return Process
async function loadBorrowedItems() {
    const ntid = document.getElementById('returnerNTID').value.trim();
    if (!ntid) {
        alert("Please enter your NTID");
        return;
    }
    
    try {
        showLoading(true);
        
        const userTransactions = transactions.filter(t => 
            t.BorrowerNTID === ntid && t.Status === 'Active');
        
        if (userTransactions.length === 0) {
            document.getElementById('borrowedItemsList').innerHTML = 
                '<div class="alert alert-info">No borrowed items found</div>';
            return;
        }
        
        const itemsList = document.getElementById('borrowedItemsList');
        itemsList.innerHTML = '';
        
        userTransactions.forEach(txn => {
            const equipment = assets.find(a => a.EquipmentID === txn.EquipmentID);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'mb-3 p-3 border rounded';
            itemDiv.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" 
                           id="return-${txn.TransactionID}">
                    <label class="form-check-label" for="return-${txn.TransactionID}">
                        <strong>${equipment.EquipmentName}</strong> (${equipment.EquipmentID})
                    </label>
                </div>
                <div class="ms-4">
                    <small class="text-muted">
                        Borrowed: ${new Date(txn.CheckoutDate).toLocaleDateString()}<br>
                        Due: ${new Date(txn.ExpectedReturn).toLocaleDateString()}
                    </small>
                </div>
            `;
            itemsList.appendChild(itemDiv);
        });
        
        document.getElementById('returnBtn').disabled = false;
    } catch (error) {
        console.error("Failed to load borrowed items:", error);
        alert("Failed to load borrowed items. Please try again.");
    } finally {
        showLoading(false);
    }
}

async function processReturn() {
    const notes = document.getElementById('returnNotes').value.trim();
    
    try {
        showLoading(true);
        alert("Return processed successfully!");
        await loadData();
        showView('dashboard');
    } catch (error) {
        console.error("Return failed:", error);
        alert("Failed to process return. Please try again.");
    } finally {
        showLoading(false);
    }
}

// Equipment Management
async function addNewEquipment() {
    const name = document.getElementById('equipmentName').value.trim();
    const serial = document.getElementById('serialNumber').value.trim();
    const qty = document.getElementById('quantity').value;
    const notes = document.getElementById('notes').value.trim();
    
    if (!name || !serial) {
        alert("Please fill required fields");
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${config.apiBaseUrl}/api/assets/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                serial_number: serial,
                quantity: qty,
                notes: notes
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to add equipment');
        }
        
        document.getElementById('addEquipmentForm').reset();
        addEquipmentModal.hide();
        await loadData();
        alert("Equipment added successfully!");
    } catch (error) {
        console.error("Add equipment failed:", error);
        alert("Failed to add equipment. Please try again.");
    } finally {
        showLoading(false);
    }
}

// History Log
function renderHistoryLog() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const filterType = document.getElementById('historyFilter').value;
    
    let filteredTransactions = transactions.filter(txn => {
        const matchesSearch = txn.BorrowerNTID.toLowerCase().includes(searchTerm) || 
                             txn.Purpose.toLowerCase().includes(searchTerm);
        
        if (filterType === 'all') return matchesSearch;
        if (filterType === 'borrow') return txn.Status === 'Active' && matchesSearch;
        if (filterType === 'return') return txn.Status === 'Returned' && matchesSearch;
        return false;
    });
    
    const logContent = document.getElementById('historyLogContent');
    logContent.innerHTML = '';
    
    filteredTransactions.forEach(txn => {
        const equipment = assets.find(a => a.EquipmentID === txn.EquipmentID);
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${txn.Status === 'Returned' ? 'return' : 'borrow'}`;
        logEntry.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <strong>${txn.BorrowerNTID}</strong> 
                    ${txn.Status === 'Returned' ? 'returned' : 'borrowed'}
                    <strong>${equipment.EquipmentName}</strong>
                    <div class="text-muted small">
                        ${new Date(txn.CheckoutDate).toLocaleString()} - 
                        ${txn.Status === 'Returned' ? 
                         new Date(txn.ActualReturn).toLocaleString() : 
                         new Date(txn.ExpectedReturn).toLocaleString()}
                    </div>
                </div>
                <span class="badge ${txn.Status === 'Returned' ? 'bg-success' : 'bg-primary'}">
                    ${txn.Status}
                </span>
            </div>
            ${txn.Purpose ? `<div><em>Purpose: ${txn.Purpose}</em></div>` : ''}
        `;
        logContent.appendChild(logEntry);
    });
}

// Helper Functions
function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

function setupEventListeners() {
    // Set default return date to today + 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('expectedReturn').valueAsDate = nextWeek;
    
    // Search/filter listeners
    document.getElementById('historySearch').addEventListener('input', renderHistoryLog);
    document.getElementById('historyFilter').addEventListener('change', renderHistoryLog);
    
    // Auto-refresh data every 30 seconds
    setInterval(loadData, 30000);
}
