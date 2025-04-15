// Configuration with fallbacks
const config = {
    apiBaseUrl: window.location.origin,
    maxRetries: 3,
    retryDelay: 1000
};

// State management
const state = {
    assets: [],
    transactions: [],
    cart: [],
    selectedReturnItems: [],
    currentView: 'dashboard'
};

// DOM Elements cache
const dom = {
    loadingIndicator: document.getElementById('loadingIndicator'),
    availableCount: document.getElementById('available-count'),
    borrowedCount: document.getElementById('borrowed-count'),
    maintenanceCount: document.getElementById('maintenance-count'),
    historyLogContent: document.getElementById('historyLogContent'),
    borrowedItemsList: document.getElementById('borrowedItemsList'),
    cartBadge: document.getElementById('cartBadge'),
    cartItemsList: document.getElementById('cartItemsList'),
    views: {
        dashboard: document.getElementById('dashboardView'),
        history: document.getElementById('historyView'),
        return: document.getElementById('returnView')
    }
};

// Modal instances
const modals = {
    items: new bootstrap.Modal('#itemsModal'),
    cart: new bootstrap.Modal('#cartModal'),
    addEquipment: new bootstrap.Modal('#addEquipmentModal')
};

// Initialize application
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    try {
        showLoading(true);
        await loadData();
        setupEventListeners();
        showView('dashboard');
        setDefaultReturnDate();
    } catch (error) {
        console.error("Initialization failed:", error);
        showError("Application failed to initialize. Please refresh.");
    } finally {
        showLoading(false);
    }
}

// Data loading with retry logic
async function loadData() {
    try {
        const [assets, transactions] = await Promise.all([
            fetchData('/api/assets'),
            fetchData('/api/transactions')
        ]);
        
        state.assets = assets;
        state.transactions = transactions;
        
        updateDashboard();
    } catch (error) {
        console.error("Data loading failed:", error);
        throw error;
    }
}

async function fetchData(endpoint) {
    for (let i = 0; i < config.maxRetries; i++) {
        try {
            const response = await fetch(`${config.apiBaseUrl}${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (i === config.maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, config.retryDelay * (i + 1)));
        }
    }
}

// View management
function showView(viewName) {
    // Hide all views
    Object.values(dom.views).forEach(view => {
        view.classList.add('d-none');
    });
    
    // Show selected view
    dom.views[viewName].classList.remove('d-none');
    state.currentView = viewName;
    
    // Special handling for views
    if (viewName === 'history') {
        renderHistoryLog();
    } else if (viewName === 'return') {
        resetReturnForm();
    }
}

// Dashboard functions
function updateDashboard() {
    dom.availableCount.textContent = state.assets.filter(a => a.Status === 'Available').length;
    dom.borrowedCount.textContent = state.assets.filter(a => a.Status === 'Borrowed').length;
    dom.maintenanceCount.textContent = state.assets.filter(a => a.Status === 'Under Maintenance').length;
}

// Modal functions
function showItemsModal(status) {
    try {
        const filteredItems = state.assets.filter(item => item.Status === status);
        document.getElementById('itemsModalTitle').textContent = `${status} Items (${filteredItems.length})`;
        
        const modalBody = document.getElementById('itemsModalBody');
        modalBody.innerHTML = '';
        
        if (filteredItems.length === 0) {
            modalBody.innerHTML = '<div class="alert alert-info">No items found</div>';
        } else {
            filteredItems.forEach(item => {
                const card = createItemCard(item, status);
                modalBody.appendChild(card);
                renderBarcode(item.EquipmentID);
            });
        }
        
        modals.items.show();
    } catch (error) {
        console.error("Error showing items:", error);
        showError("Failed to load items");
    }
}

function createItemCard(item, status) {
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
            <button class="btn btn-sm btn-primary w-100 add-to-cart-btn" 
                    data-id="${item.EquipmentID}">
                <i class="bi bi-cart-plus"></i> Add to Cart
            </button>
        </div>
        ` : ''}
    `;
    return card;
}

function renderBarcode(equipmentId) {
    try {
        JsBarcode(`#barcode-${equipmentId}`, equipmentId, {
            format: "CODE128",
            lineColor: "#000",
            width: 1.5,
            height: 40,
            displayValue: false
        });
    } catch (error) {
        console.error("Barcode error:", error);
    }
}

// Cart system
function addToCart(equipmentId) {
    const item = state.assets.find(i => i.EquipmentID === equipmentId);
    if (item) {
        state.cart.push(item);
        updateCartUI();
    }
}

function updateCartUI() {
    dom.cartBadge.textContent = state.cart.length;
    dom.cartItemsList.innerHTML = state.cart.length ? '' : '<div class="alert alert-info">Your cart is empty</div>';
    
    state.cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'mb-3 p-3 border rounded';
        cartItem.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <h6>${item.EquipmentName}</h6>
                    <small class="text-muted">${item.EquipmentID}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger remove-from-cart-btn" 
                        data-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        dom.cartItemsList.appendChild(cartItem);
    });
}

function clearCart() {
    state.cart = [];
    updateCartUI();
    modals.cart.hide();
}

// Borrow/Return functions
async function processBorrow() {
    const borrowerId = document.getElementById('borrowerId').value.trim();
    const expectedReturn = document.getElementById('expectedReturn').value;
    const purpose = document.getElementById('borrowPurpose').value.trim();
    
    if (!borrowerId || !expectedReturn || state.cart.length === 0) {
        showError("Please fill all required fields");
        return;
    }
    
    try {
        showLoading(true);
        
        for (const item of state.cart) {
            await fetch(`${config.apiBaseUrl}/api/transactions/borrow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipment_id: item.EquipmentID,
                    borrower_ntid: borrowerId,
                    expected_return: expectedReturn,
                    purpose: purpose
                })
            });
        }
        
        state.cart = [];
        updateCartUI();
        await loadData();
        modals.cart.hide();
        showSuccess("Equipment borrowed successfully!");
    } catch (error) {
        console.error("Borrow failed:", error);
        showError("Failed to process borrowing");
    } finally {
        showLoading(false);
    }
}

// History log
function renderHistoryLog() {
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const filterType = document.getElementById('historyFilter').value;
    
    const filtered = state.transactions.filter(txn => {
        const matchesSearch = txn.BorrowerNTID.toLowerCase().includes(searchTerm) || 
                            (txn.Purpose || '').toLowerCase().includes(searchTerm);
        
        return filterType === 'all' ? matchesSearch : 
               filterType === 'borrow' ? (txn.Status === 'Active' && matchesSearch) :
               (txn.Status === 'Returned' && matchesSearch);
    });
    
    dom.historyLogContent.innerHTML = filtered.length ? '' : '<div class="alert alert-info">No transactions found</div>';
    
    filtered.forEach(txn => {
        const item = state.assets.find(a => a.EquipmentID === txn.EquipmentID) || {};
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${txn.Status === 'Returned' ? 'return' : 'borrow'}`;
        logEntry.innerHTML = `
            <div class="d-flex justify-content-between">
                <div>
                    <strong>${txn.BorrowerNTID}</strong> 
                    ${txn.Status === 'Returned' ? 'returned' : 'borrowed'}
                    <strong>${item.EquipmentName || txn.EquipmentID}</strong>
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
        dom.historyLogContent.appendChild(logEntry);
    });
}

// Helper functions
function showLoading(show) {
    dom.loadingIndicator.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3 z-3';
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3 z-3';
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

function setDefaultReturnDate() {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('expectedReturn').valueAsDate = nextWeek;
}

function setupEventListeners() {
    // Event delegation for dynamic elements
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            addToCart(e.target.dataset.id);
        }
        
        if (e.target.classList.contains('remove-from-cart-btn')) {
            state.cart.splice(parseInt(e.target.dataset.index), 1);
            updateCartUI();
        }
    });
    
    // Search/filter listeners
    document.getElementById('historySearch').addEventListener('input', renderHistoryLog);
    document.getElementById('historyFilter').addEventListener('change', renderHistoryLog);
    
    // Auto-refresh data every 30 seconds
    setInterval(loadData, 30000);
}
