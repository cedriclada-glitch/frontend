// API URL - automatically detects environment
const API_URL = (() => {
    // Check if we're on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    // Production API URL
    return 'https://backend-6534.onrender.com/api';
})();

// Get or create session ID for cart
function getSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    return { token, userRole };
}

// Update cart badge with enhanced error handling
async function updateCartBadge() {
    try {
        const sessionId = getSessionId();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_URL}/cartRoutes/${sessionId}/items`, {
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        }).catch(() => {
            clearTimeout(timeoutId);
            return null;
        }); // Silently fail for badge updates
        
        clearTimeout(timeoutId);
        
        if (response && response.ok) {
            const cart = await response.json();
            const totalItems = cart.items ? cart.items.reduce((sum, item) => {
                const qty = parseInt(item.quantity) || 0;
                return sum + qty;
            }, 0) : 0;
            
            const badge = document.getElementById('cartBadge');
            if (badge) {
                badge.textContent = totalItems;
                badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
                
                // Add pulse animation when items are added
                if (totalItems > 0) {
                    badge.style.animation = 'pulse 0.5s ease';
                    setTimeout(() => {
                        badge.style.animation = '';
                    }, 500);
                }
            }
        } else {
            // If cart fetch fails, hide badge
            const badge = document.getElementById('cartBadge');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating cart badge:', error);
        // Don't show error to user for badge updates
    }
}

// Add to cart with enhanced animation and error handling
async function addToCart(productId, productName) {
    if (!productId) {
        alert('Invalid product. Please try again.');
        return;
    }
    
    const sessionId = getSessionId();
    const button = event?.target;
    const originalText = button ? button.innerHTML : 'Add to Cart';
    
    try {
        if (button) {
            button.disabled = true;
            button.innerHTML = 'Adding...';
        }
        
        // Use AbortController for better timeout handling (AbortSignal.timeout not supported in all browsers)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${API_URL}/cart/${sessionId}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ productId, quantity: 1 }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
            const cartData = await response.json();
            
            // Debug: Log cart data to verify items are being saved
            console.log('Cart after adding item:', cartData);
            console.log('Items in cart:', cartData.items);
            console.log('Total items:', cartData.items ? cartData.items.length : 0);
            
            // Success animation
            if (button) {
                button.innerHTML = '✓ Added!';
                button.classList.add('added');
            }
            
            // Create floating animation
            if (button) {
                createFloatingAnimation(button, '✓ Added to Cart!');
            }
            
            // Update cart badge
            await updateCartBadge();
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'cart-notification';
            notification.innerHTML = `✓ ${productName} added to cart!`;
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: linear-gradient(45deg, #00ff00, #00cc00); color: white; padding: 1rem 2rem; border-radius: 10px; z-index: 10000; animation: slideIn 0.3s ease; box-shadow: 0 5px 20px rgba(0, 255, 0, 0.5);';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
            
            // Reset button after animation
            if (button) {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('added');
                    button.disabled = false;
                }, 2000);
            }
        } else {
            const data = await response.json();
            const errorMsg = data.error || 'Failed to add to cart';
            
            if (button) {
                button.innerHTML = 'Error';
                button.classList.add('error');
            }
            
            alert(errorMsg);
            
            if (button) {
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('error');
                    button.disabled = false;
                }, 2000);
            }
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        if (button) {
            button.innerHTML = 'Error';
            button.classList.add('error');
        }
        
        alert(`Failed to add to cart: ${error.message || 'Please check your connection and try again.'}`);
        
        if (button) {
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('error');
                button.disabled = false;
            }, 2000);
        }
    }
}

// Create floating animation
function createFloatingAnimation(element, text) {
    const floating = document.createElement('div');
    floating.className = 'floating-message';
    floating.textContent = text;
    floating.style.position = 'fixed';
    floating.style.left = element.getBoundingClientRect().left + 'px';
    floating.style.top = element.getBoundingClientRect().top + 'px';
    floating.style.pointerEvents = 'none';
    floating.style.zIndex = '10000';
    document.body.appendChild(floating);
    
    setTimeout(() => {
        floating.style.transition = 'all 0.8s ease-out';
        floating.style.transform = 'translateY(-50px)';
        floating.style.opacity = '0';
        setTimeout(() => floating.remove(), 800);
    }, 10);
}

// Load products on home page
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            if (products.length === 0) {
                productsGrid.innerHTML = '<p style="text-align: center; color: var(--text-gray); grid-column: 1 / -1;">No products available. Please seed the database.</p>';
            } else {
                productsGrid.innerHTML = products.map(product => `
                    <div class="product-card">
                        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/300'">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <p class="product-price">₱${parseFloat(product.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <button class="btn-add-cart" onclick="addToCart('${product._id}', '${product.name}')" ${product.stock <= 0 ? 'disabled' : ''}>
                            ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                `).join('');
            }
        }
        // Update cart badge when page loads
        await updateCartBadge();
    } catch (error) {
        console.error('Error loading products:', error);
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = '<p style="text-align: center; color: #ff0066; grid-column: 1 / -1;">Error loading products. Please check if the backend server is running.</p>';
        }
    }
}

// Tab switching for login/register
function switchTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginBtn = document.querySelector('.tab-btn:first-child');
    const registerBtn = document.querySelector('.tab-btn:last-child');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
    }
}

// Login functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('loginError');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email || email);
                
                if (data.user.role === 'Admin') {
                    window.location.href = 'admin.html';
                } else {
                    // User logged in - show user features
                    window.location.href = 'index.html';
                }
            } else {
                errorMsg.textContent = data.message || 'Login failed';
                errorMsg.classList.add('show');
            }
        } catch (error) {
            errorMsg.textContent = 'Connection error. Please try again.';
            errorMsg.classList.add('show');
        }
    });
}

// Registration functionality
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const errorMsg = document.getElementById('registerError');
        const successMsg = document.getElementById('registerSuccess');

        // Clear previous messages
        errorMsg.textContent = '';
        errorMsg.classList.remove('show');
        successMsg.textContent = '';
        successMsg.classList.remove('show');

        // Validate passwords match
        if (password !== confirmPassword) {
            errorMsg.textContent = 'Passwords do not match';
            errorMsg.classList.add('show');
            return;
        }

        // Validate password length
        if (password.length < 6) {
            errorMsg.textContent = 'Password must be at least 6 characters';
            errorMsg.classList.add('show');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    name, 
                    email, 
                    password,
                    role: 'User' // Default role for new users
                })
            });

            const data = await response.json();

            if (response.ok) {
                successMsg.textContent = 'Account created successfully! Redirecting to login...';
                successMsg.classList.add('show');
                
                // Auto-fill login form and switch to login tab
                setTimeout(() => {
                    document.getElementById('email').value = email;
                    switchTab('login');
                    successMsg.textContent = '';
                    successMsg.classList.remove('show');
                }, 2000);
            } else {
                errorMsg.textContent = data.message || 'Registration failed';
                errorMsg.classList.add('show');
            }
        } catch (error) {
            errorMsg.textContent = 'Connection error. Please try again.';
            errorMsg.classList.add('show');
        }
    });
}

// Admin functions
async function loadAdminProducts() {
    const { token } = checkAuth();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        const tableBody = document.getElementById('adminProductsTable');
        if (tableBody) {
            if (products.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-gray);">No products found. Click "Add New Product" to create one.</td></tr>';
            } else {
                tableBody.innerHTML = products.map(product => `
                    <tr>
                        <td>${product._id.substring(0, 8)}...</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img src="${product.image || 'https://via.placeholder.com/50'}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" onerror="this.src='https://via.placeholder.com/50'">
                                <span>${product.name}</span>
                            </div>
                        </td>
                        <td>${product.description.substring(0, 50)}...</td>
                        <td>₱${parseFloat(product.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>${product.category || 'N/A'}</td>
                        <td>${product.stock || 0}</td>
                        <td>
                            <button class="btn-edit" onclick="editProduct('${product._id}')">Edit</button>
                            <button class="btn-danger" onclick="deleteProduct('${product._id}')">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
        const tableBody = document.getElementById('adminProductsTable');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff0066;">Error loading products. Please check your connection.</td></tr>';
        }
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { token } = checkAuth();
    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadAdminProducts();
        } else {
            alert('Failed to delete product');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
    }
}

function editProduct(id) {
    const { token } = checkAuth();
    
    fetch(`${API_URL}/products/${id}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(product => {
        document.getElementById('productId').value = product._id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productStock').value = product.stock || 0;
        
        // Set image source based on whether it's a URL or uploaded file
        if (product.image) {
            if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
                // It's a URL
                document.getElementById('imageUrl').checked = true;
                document.getElementById('productImage').value = product.image;
                document.getElementById('productImageFile').style.display = 'none';
                document.getElementById('productImage').style.display = 'block';
                
                // Show preview
                const preview = document.getElementById('imagePreview');
                const previewImg = document.getElementById('previewImg');
                previewImg.src = product.image;
                preview.style.display = 'block';
            } else {
                // It's an uploaded file (relative path)
                document.getElementById('imageFile').checked = true;
                document.getElementById('productImage').style.display = 'none';
                document.getElementById('productImageFile').style.display = 'block';
                
                // Show preview from the URL
                const preview = document.getElementById('imagePreview');
                const previewImg = document.getElementById('previewImg');
                previewImg.src = product.image.startsWith('/') ? `http://localhost:5000${product.image}` : product.image;
                preview.style.display = 'block';
            }
        }
        
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productModal').classList.add('show');
    })
    .catch(error => {
        console.error('Error loading product:', error);
    });
}

// Modal functionality
const addProductBtn = document.getElementById('addProductBtn');
const productModal = document.getElementById('productModal');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close');
const productForm = document.getElementById('productForm');

if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
        document.getElementById('productId').value = '';
        document.getElementById('productForm').reset();
        document.getElementById('imageUrl').checked = true;
        toggleImageInput();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('modalTitle').textContent = 'Add Product';
        productModal.classList.add('show');
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        if (productModal) {
            productModal.classList.remove('show');
            if (productForm) {
                productForm.reset();
                const productIdInput = document.getElementById('productId');
                if (productIdInput) productIdInput.value = '';
                const imageUrlRadio = document.getElementById('imageUrl');
                if (imageUrlRadio) {
                    imageUrlRadio.checked = true;
                    toggleImageInput();
                }
                const imagePreview = document.getElementById('imagePreview');
                if (imagePreview) imagePreview.style.display = 'none';
            }
        }
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if (productModal) {
            productModal.classList.remove('show');
            if (productForm) {
                productForm.reset();
                const productIdInput = document.getElementById('productId');
                if (productIdInput) productIdInput.value = '';
                const imageUrlRadio = document.getElementById('imageUrl');
                if (imageUrlRadio) {
                    imageUrlRadio.checked = true;
                    toggleImageInput();
                }
                const imagePreview = document.getElementById('imagePreview');
                if (imagePreview) imagePreview.style.display = 'none';
            }
        }
    });
}

// Toggle image input (URL vs File)
function toggleImageInput() {
    const imageUrlRadio = document.getElementById('imageUrl');
    const imageFileRadio = document.getElementById('imageFile');
    const imageUrlInput = document.getElementById('productImage');
    const imageFileInput = document.getElementById('productImageFile');
    
    if (imageUrlRadio.checked) {
        imageUrlInput.style.display = 'block';
        imageUrlInput.required = true;
        imageFileInput.style.display = 'none';
        imageFileInput.required = false;
        imageFileInput.value = '';
    } else {
        imageUrlInput.style.display = 'none';
        imageUrlInput.required = false;
        imageUrlInput.value = '';
        imageFileInput.style.display = 'block';
        imageFileInput.required = true;
    }
    document.getElementById('imagePreview').style.display = 'none';
}

// Image preview for URL
const productImageInput = document.getElementById('productImage');
if (productImageInput) {
    productImageInput.addEventListener('input', function() {
        const url = this.value;
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        if (url && document.getElementById('imageUrl').checked) {
            previewImg.src = url;
            preview.style.display = 'block';
            previewImg.onerror = () => {
                preview.style.display = 'none';
            };
        } else {
            preview.style.display = 'none';
        }
    });
}

// Image preview for file
const productImageFileInput = document.getElementById('productImageFile');
if (productImageFileInput) {
    productImageFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                const previewImg = document.getElementById('previewImg');
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { token } = checkAuth();
        
        const productId = document.getElementById('productId').value;
        const imageUrlRadio = document.getElementById('imageUrl');
        const imageFileInput = document.getElementById('productImageFile');
        const imageUrlInput = document.getElementById('productImage');
        
        // Check if using file upload or URL
        const useFileUpload = document.getElementById('imageFile').checked && imageFileInput.files.length > 0;
        
        try {
            let response;
            
            if (useFileUpload) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('name', document.getElementById('productName').value);
                formData.append('description', document.getElementById('productDescription').value);
                formData.append('price', parseFloat(document.getElementById('productPrice').value));
                formData.append('category', document.getElementById('productCategory').value);
                formData.append('stock', parseInt(document.getElementById('productStock').value) || 0);
                
                // Only append image if it's a new file or editing
                if (imageFileInput.files.length > 0) {
                    formData.append('image', imageFileInput.files[0]);
                }
                
                const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
                const method = productId ? 'PUT' : 'POST';
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Don't set Content-Type for FormData, browser will set it with boundary
                    },
                    body: formData
                });
            } else {
                // Use JSON for URL
                const productData = {
                    name: document.getElementById('productName').value,
                    description: document.getElementById('productDescription').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    image: imageUrlInput.value,
                    category: document.getElementById('productCategory').value,
                    stock: parseInt(document.getElementById('productStock').value) || 0
                };

                const url = productId ? `${API_URL}/products/${productId}` : `${API_URL}/products`;
                const method = productId ? 'PUT' : 'POST';
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(productData)
                });
            }

            if (response.ok) {
                productModal.classList.remove('show');
                productForm.reset();
                document.getElementById('productId').value = '';
                document.getElementById('imageUrl').checked = true;
                toggleImageInput();
                document.getElementById('imagePreview').style.display = 'none';
                loadAdminProducts();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to save product');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product');
        }
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        window.location.href = 'login.html';
    });
}

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });
}

// Load cart page with enhanced error handling
async function loadCart() {
    const sessionId = getSessionId();
    const cartContent = document.getElementById('cartContent');
    const checkoutSection = document.getElementById('checkoutSection');
    
    // Show loading state
    if (cartContent) {
        cartContent.innerHTML = '<div style="text-align: center; padding: 3rem;"><p style="color: var(--neon-cyan);">Loading cart...</p></div>';
    }
    
    try {
        // Add timeout and retry logic for Render backend (which may be sleeping)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response;
        let retries = 2;
        
        while (retries >= 0) {
            try {
                response = await fetch(`${API_URL}/cart/${sessionId}`, {
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                clearTimeout(timeoutId);
                break;
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout. The server may be starting up. Please try again in a moment.');
                }
                retries--;
                if (retries < 0) throw error;
                // Wait 2 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cart = await response.json();
        
        // Debug logging to help diagnose issues
        console.log('=== CART LOAD DEBUG ===');
        console.log('Session ID:', sessionId);
        console.log('Cart data received:', cart);
        console.log('Cart items array:', cart.items);
        console.log('Cart items length:', cart.items ? cart.items.length : 0);
        if (cart.items && cart.items.length > 0) {
            console.log('First item structure:', cart.items[0]);
            console.log('First item productId type:', typeof cart.items[0].productId);
            console.log('First item productId value:', cart.items[0].productId);
        }
        console.log('========================');
        
        // Check if cart exists and has items
        if (!cart || !cart.items || cart.items.length === 0) {
            console.log('Cart is empty or has no items');
            if (cartContent) {
                cartContent.innerHTML = `
                    <div style="text-align: center; padding: 3rem;">
                        <h2 style="color: var(--text-gray); margin-bottom: 1rem;">Your cart is empty</h2>
                        <p style="color: var(--text-gray); margin-bottom: 2rem;">Add some products to get started!</p>
                        <a href="index.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Continue Shopping</a>
                    </div>
                `;
            }
            if (checkoutSection) {
                checkoutSection.style.display = 'none';
            }
        } else {
            // Process items - be more lenient with validation
            const validItems = cart.items.filter(item => {
                // Item is valid if it has quantity > 0
                // Price and productId can be missing/null but we'll handle that in rendering
                const hasQuantity = item.quantity > 0 && parseInt(item.quantity) > 0;
                
                if (!hasQuantity) {
                    console.log('Item filtered out - invalid quantity:', item);
                }
                
                return hasQuantity;
            });
            
            console.log('Total items:', cart.items.length, 'Valid items:', validItems.length);
            console.log('Valid items after filtering:', validItems);
            
            if (validItems.length === 0) {
                console.log('No valid items found after filtering');
                if (cartContent) {
                    cartContent.innerHTML = `
                        <div style="text-align: center; padding: 3rem;">
                            <h2 style="color: var(--text-gray); margin-bottom: 1rem;">Your cart is empty</h2>
                            <p style="color: var(--text-gray); margin-bottom: 2rem;">Add some products to get started!</p>
                            <a href="index.html" class="btn-primary" style="text-decoration: none; display: inline-block;">Continue Shopping</a>
                        </div>
                    `;
                }
                if (checkoutSection) {
                    checkoutSection.style.display = 'none';
                }
            } else {
                // Render cart items - handle both populated and non-populated productId
                if (cartContent) {
                    cartContent.innerHTML = `
                        <div class="cart-items">
                            ${validItems.map((item) => {
                                // Handle productId - could be object (populated) or string/ID
                                let product = {};
                                if (typeof item.productId === 'object' && item.productId !== null) {
                                    // Product is populated (has name, image, etc.)
                                    product = item.productId;
                                } else if (typeof item.productId === 'string' && item.productId.length > 0) {
                                    // ProductId is just an ID string - fetch product details
                                    // For now, use fallback but try to fetch if possible
                                    product = {
                                        name: 'Product',
                                        image: 'https://via.placeholder.com/100',
                                        _id: item.productId
                                    };
                                } else {
                                    // No productId at all - use fallback
                                    product = {
                                        name: 'Product',
                                        image: 'https://via.placeholder.com/100'
                                    };
                                }
                                
                                // Get values with fallbacks
                                const productName = product.name || 'Product';
                                const productImage = product.image || 'https://via.placeholder.com/100';
                                const itemPrice = parseFloat(item.price) || 0;
                                const itemQuantity = parseInt(item.quantity) || 1;
                                const itemTotal = itemPrice * itemQuantity;
                                const itemId = item._id || item.id || `item-${index}`;
                                
                                // If we have productId but no product name, try to fetch it
                                if (product._id && !product.name && typeof product._id === 'string') {
                                    // Fetch product details asynchronously (don't block rendering)
                                    fetch(`${API_URL}/products/${product._id}`)
                                        .then(res => res.json())
                                        .then(productData => {
                                            // Update the product name and image in the DOM
                                            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
                                            if (itemElement) {
                                                const nameEl = itemElement.querySelector('.cart-item-details h3');
                                                const imgEl = itemElement.querySelector('.cart-item-image');
                                                if (nameEl && productData.name) nameEl.textContent = productData.name;
                                                if (imgEl && productData.image) imgEl.src = productData.image;
                                            }
                                        })
                                        .catch(err => console.log('Could not fetch product details:', err));
                                }
                                
                                // Debug log removed for cleaner console
                                
                                return `
                                    <div class="cart-item" data-item-id="${itemId}">
                                        <img src="${productImage}" alt="${productName}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/100'">
                                        <div class="cart-item-details">
                                            <h3>${productName}</h3>
                                            <p class="cart-item-price">₱${itemPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} each</p>
                                        </div>
                                        <div class="cart-item-quantity">
                                            <button onclick="updateCartQuantity('${itemId}', ${itemQuantity - 1})" ${itemQuantity <= 1 ? 'disabled' : ''}>-</button>
                                            <span>${itemQuantity}</span>
                                            <button onclick="updateCartQuantity('${itemId}', ${itemQuantity + 1})">+</button>
                                        </div>
                                        <div class="cart-item-total">
                                            <p>₱${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                        <button class="btn-remove" onclick="removeFromCart('${itemId}')">Remove</button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="cart-actions">
                            <a href="index.html" class="btn-secondary">Continue Shopping</a>
                        </div>
                    `;
                }
                
                // Show checkout section
                if (checkoutSection) {
                    checkoutSection.style.display = 'block';
                    const subtotal = cart.total || validItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
                    const tax = subtotal * 0.1;
                    const total = subtotal + tax;
                    
                    const subtotalEl = document.getElementById('subtotal');
                    const taxEl = document.getElementById('tax');
                    const totalEl = document.getElementById('total');
                    
                    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    if (taxEl) taxEl.textContent = `₱${tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    if (totalEl) totalEl.textContent = `₱${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                    
                    // Pre-fill user info if logged in
                    const userEmail = localStorage.getItem('userEmail');
                    const userName = localStorage.getItem('userName');
                    const customerEmailInput = document.getElementById('customerEmail');
                    const customerNameInput = document.getElementById('customerName');
                    
                    if (userEmail && customerEmailInput) {
                        customerEmailInput.value = userEmail;
                    }
                    if (userName && customerNameInput) {
                        customerNameInput.value = userName;
                    }
                }
            }
        }
        
        await updateCartBadge();
    } catch (error) {
        console.error('Error loading cart:', error);
        if (cartContent) {
            let errorMessage = error.message || 'Please try again later.';
            
            // Provide helpful messages for common issues
            if (error.message && error.message.includes('timeout')) {
                errorMessage = 'The server is starting up. This may take 30-60 seconds on the first request. Please wait and try again.';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please check your internet connection and ensure the backend is running.';
            }
            
            cartContent.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2 style="color: #ff0066; margin-bottom: 1rem;">Error loading cart</h2>
                    <p style="color: var(--text-gray); margin-bottom: 2rem;">${errorMessage}</p>
                    <button onclick="loadCart()" class="btn-primary">Retry</button>
                    <a href="index.html" class="btn-secondary" style="text-decoration: none; display: inline-block; margin-left: 1rem;">Continue Shopping</a>
                </div>
            `;
        }
        if (checkoutSection) {
            checkoutSection.style.display = 'none';
        }
    }
}

// Update cart quantity with enhanced feedback
async function updateCartQuantity(itemId, quantity) {
    if (quantity <= 0) {
        await removeFromCart(itemId);
        return;
    }
    
    const sessionId = getSessionId();
    const button = event?.target;
    
    try {
        // Show loading state on button
        if (button) {
            button.disabled = true;
            const originalText = button.textContent;
            button.textContent = '...';
        }
        
        const response = await fetch(`${API_URL}/cart/${sessionId}/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity })
        });
        
        if (response.ok) {
            await loadCart();
            await updateCartBadge();
            
            // Show brief success feedback
            if (button) {
                button.textContent = '✓';
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = button.textContent === '+' ? '+' : '-';
                }, 500);
            }
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update cart quantity');
            if (button) {
                button.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        alert('Failed to update cart. Please try again.');
        if (button) {
            button.disabled = false;
        }
    }
}

// Remove from cart with enhanced feedback
async function removeFromCart(itemId) {
    if (!confirm('Remove this item from cart?')) return;
    
    const sessionId = getSessionId();
    const button = event?.target;
    
    try {
        // Show loading state
        if (button) {
            button.disabled = true;
            button.textContent = 'Removing...';
        }
        
        const response = await fetch(`${API_URL}/cart/${sessionId}/items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Show success animation
            if (button) {
                button.textContent = '✓ Removed';
                button.style.background = '#00ff00';
            }
            
            await loadCart();
            await updateCartBadge();
            
            // Show notification
            const notification = document.createElement('div');
            notification.className = 'cart-notification';
            notification.textContent = 'Item removed from cart';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff0066; color: white; padding: 1rem 2rem; border-radius: 10px; z-index: 10000; animation: slideIn 0.3s ease;';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to remove item');
            if (button) {
                button.disabled = false;
                button.textContent = 'Remove';
            }
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Failed to remove item. Please try again.');
        if (button) {
            button.disabled = false;
            button.textContent = 'Remove';
        }
    }
}

// Checkout form with enhanced validation and feedback
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sessionId = getSessionId();
        const customerName = document.getElementById('customerName').value.trim();
        const customerEmail = document.getElementById('customerEmail').value.trim();
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        
        // Validation
        if (!customerName || customerName.length < 2) {
            alert('Please enter a valid name (at least 2 characters)');
            return;
        }
        
        if (!customerEmail || !customerEmail.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        try {
            // First verify cart has items
            const cartResponse = await fetch(`${API_URL}/cart/${sessionId}`);
            if (!cartResponse.ok) {
                throw new Error('Failed to verify cart');
            }
            
            const cart = await cartResponse.json();
            if (!cart.items || cart.items.length === 0) {
                alert('Your cart is empty. Please add items before placing an order.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                return;
            }
            
            // Place order
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ customerName, customerEmail, sessionId })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Show success message
                submitBtn.textContent = '✓ Order Placed!';
                submitBtn.style.background = 'linear-gradient(45deg, #00ff00, #00cc00)';
                
                // Create success notification
                const successMsg = document.createElement('div');
                successMsg.className = 'order-success-message';
                successMsg.innerHTML = `
                    <div style="background: rgba(0, 255, 0, 0.2); border: 2px solid #00ff00; border-radius: 10px; padding: 2rem; text-align: center; margin: 2rem 0;">
                        <h2 style="color: #00ff00; margin-bottom: 1rem;">✓ Order Placed Successfully!</h2>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;"><strong>Order Number:</strong> ${data.order.orderNumber}</p>
                        <p style="color: var(--text-light); margin-bottom: 0.5rem;"><strong>Total:</strong> ₱${parseFloat(data.order.total).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p style="color: var(--text-gray); margin-top: 1rem;">Thank you for your order! You will receive a confirmation email shortly.</p>
                    </div>
                `;
                checkoutForm.parentNode.insertBefore(successMsg, checkoutForm);
                
                // Redirect after 3 seconds
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 3000);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to place order. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        } catch (error) {
            console.error('Error placing order:', error);
            alert(`Failed to place order: ${error.message || 'Please try again.'}`);
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
}

// Show user info in navbar
function showUserInfo() {
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const userNav = document.getElementById('userNav');
    const userNameEl = document.getElementById('userName');
    const loginLink = document.getElementById('loginLink');
    
    if (userName && userNav && userNameEl) {
        userNav.style.display = 'block';
        userNameEl.textContent = `👤 ${userName}`;
        if (loginLink) {
            loginLink.textContent = 'Logout';
            loginLink.href = '#';
            loginLink.onclick = (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                window.location.href = 'login.html';
            };
        }
    }
}

// Initialize
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadProducts();
    showUserInfo();
    updateCartBadge();
}

if (window.location.pathname.includes('cart.html')) {
    loadCart();
    showUserInfo();
    updateCartBadge();
}

// Show user info on all pages
if (document.getElementById('userNav')) {
    showUserInfo();
    updateCartBadge();
}

if (window.location.pathname.includes('admin.html')) {
    const { token, userRole } = checkAuth();
    if (!token || userRole !== 'Admin') {
        window.location.href = 'login.html';
    } else {
        loadAdminProducts();
    }
}
