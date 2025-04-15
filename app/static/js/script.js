// Configuration
const config = {
    apiBaseUrl: window.location.origin
};

// Global State
let assets = [];
let transactions = [];
let cart = [];

// Initialize App with Error Handling
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();
        setupEventListeners();
        showView('dashboard');
    } catch (error) {
        console.error("Initialization failed:", error);
        showError("Failed to initialize application. Please refresh.");
    }
});

// Enhanced loadData() with Retry Logic
async function loadData() {
    showLoading(true);
    try {
        const [assetsResponse, transactionsResponse] = await Promise.all([
            fetchWithRetry(`${config.apiBaseUrl}/api/assets`),
            fetchWithRetry(`${config.apiBaseUrl}/api/transactions`)
        ]);
        
        if (!assetsResponse.ok || !transactionsResponse.ok) {
            throw new Error("API request failed");
        }
        
        assets = await assetsResponse.json();
        transactions = await transactionsResponse.json();
        
        updateDashboard();
    } catch (error) {
        console.error("Data loading failed:", error);
        showError("Failed to load data. Please refresh the page.");
        throw error; // Re-throw for initialization handler
    } finally {
        showLoading(false);
    }
}

// Helper function with retry logic
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Update showItemsModal with Error Handling
function showItemsModal(status) {
    try {
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
            
            try {
                JsBarcode(`#barcode-${item.EquipmentID}`, item.EquipmentID, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 1.5,
                    height: 40,
                    displayValue: false
                });
            } catch (error) {
                console.error("Barcode generation failed:", error);
            }
        });
        
        itemsModal.show();
    } catch (error) {
        console.error("Modal error:", error);
        showError("Failed to load items. Please try again.");
    }
}

// Add this error display function
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}
