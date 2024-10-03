const apiKey = 'AiZaSyA0j1H8_v-ZaVa25wZkDuOf_oEgz3xhb_o';
const projectId = "e-commerce-website-bf09a";
const productsCollectionId = 'products'; // Firestore products collection ID
const usersCollectionId = 'users'; // Firestore users collection ID
const cartCollectionId = 'carts'; // Firestore cart collection ID
let searchQuery = ''; // Current search query

const baseUrlProducts = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${productsCollectionId}`;
const baseUrlCarts = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${cartCollectionId}`;
const baseUrlUsers = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${usersCollectionId}`;

let cart = [];
let currentPage = 1; // Track the current page
const productsPerPage = 10; // Total products per page
let products = []; // Declare products variable
let currentCategory = null; // Current category filter
// Retrieve logged-in user ID from localStorage
const currentUserId = localStorage.getItem('loggedInUserId');

// Optional: Call fetchProducts on page load if needed for other parts of the site
window.onload = function() {
    fetchProducts(); // Ensure to call your fetchProducts function if needed
};

// Fetch cart items for the logged-in user
async function fetchUserCart() {
    if (!currentUserId) return [];

    try {
        const response = await fetch(`${baseUrlCarts}?key=${apiKey}`);
        const data = await response.json();

        if (data.documents) {
            // Filter cart items to only show those that belong to the current user
            return data.documents
                .map(doc => doc.fields)
                .filter(item => item.userId.stringValue === currentUserId);
        }

        return [];
    } catch (error) {
        console.error('Error fetching cart items:', error);
        return [];
    }
}

// Function to fetch user details based on logged-in user ID
async function fetchUserDetails() {
    // Retrieve logged-in user ID from local storage
    const loggedInUserId = localStorage.getItem('loggedInUserId');

    if (loggedInUserId) {
        console.log(`Fetching user details for ID: ${loggedInUserId}`);

        try {
            // Fetch user document using the Firestore REST API
            const response = await fetch(`${baseUrlUsers}/${loggedInUserId}?key=${apiKey}`);
            const userData = await response.json();

            // Check if the user document exists
            if (userData.fields) {
                // Extract and display user details
                const firstName = userData.fields.firstName.stringValue;
                const lastName = userData.fields.lastName.stringValue;
                const email = userData.fields.email.stringValue;

                console.log(`User Data:`, userData);

                // Update the modal or HTML with the user details
                document.getElementById('loggedUserFName').innerText = firstName;
                document.getElementById('loggedUserLName').innerText = lastName;
                document.getElementById('loggedUserEmail').innerText = email;

                // Open the modal after user data is fetched
                openModal();
            } else {
                console.log("No document found matching the ID.");
            }
        } catch (error) {
            console.error('Error fetching document:', error);
        }
    } else {
        console.log("User ID not found in local storage.");
    }
}

// Function to open the modal
function openModal() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'block'; // Show the modal
}

// Function to close the modal
function closeModal() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'none'; // Hide the modal
}

// Close the modal if the user clicks outside the modal content
window.onclick = function(event) {
    const modal = document.getElementById('profile-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Function to add product to cart
async function addToCart(productId) {
    if (!currentUserId) {
        alert("Please log in to add items to your cart.");
        return;
    }

    const documentId = `${currentUserId}_${productId}`; // Create a unique document ID
    try {
        // Check if the product is already in the user's cart
        const cartItemRef = `${baseUrlCarts}/${documentId}?key=${apiKey}`;
        const existingCartItem = await fetch(cartItemRef);

        // If the response status is 404, it means the item is not in the cart, so create a new document
        if (existingCartItem.status === 404) {
            const productRef = `${baseUrlProducts}/${productId}?key=${apiKey}`;
            const productResponse = await fetch(productRef);
            const productData = await productResponse.json();

            if (productData.fields) {
                const cartItemData = {
                    userId: currentUserId,
                    productId: productId,
                    quantity: 1,
                    name: productData.fields.name.stringValue,
                    price: productData.fields.price.doubleValue,
                    description: productData.fields.description.stringValue,
                    imageUrl: productData.fields.imageUrl.stringValue,
                };

                // Store the cart item in Firestore under the carts collection
                await fetch(`${baseUrlCarts}/${documentId}?key=${apiKey}`, {
                    method: "PATCH", // Use PATCH to create or update the document
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            userId: { stringValue: currentUserId },
                            productId: { stringValue: productId },
                            quantity: { integerValue: 1 },
                            name: { stringValue: cartItemData.name },
                            price: { doubleValue: cartItemData.price },
                            description: { stringValue: cartItemData.description },
                            imageUrl: { stringValue: cartItemData.imageUrl }
                        }
                    })
                });

                // Update cart button to indicate the item was added
                const button = document.querySelector(`button[onclick="addToCart('${productId}')"]`);
                button.textContent = "Added to Cart";
                button.disabled = true; // Disable the button after adding
            }
        } else {
            // If the item already exists in the cart, alert the user
            alert("Item is already in your cart!");
        }
    } catch (error) {
        console.error('Error adding item to cart:', error);
    }
}

// Function to fetch products and display them
async function fetchProducts() {
    try {
        const response = await fetch(`${baseUrlProducts}?key=${apiKey}`);
        const data = await response.json();
        products = data.documents;

        // Fetch the user's cart to disable "Add to Cart" buttons for already added items
        cart = await fetchUserCart();

        // Ensure products have their quantities set correctly
        await Promise.all(products.map(async (product) => {
            const productId = product.name.split('/').pop(); // Extract product ID
            const quantityResponse = await fetch(`${baseUrlProducts}/${productId}?key=${apiKey}`);
            const quantityData = await quantityResponse.json();
            product.fields.quantity = quantityData.fields.quantity; // Assuming quantity is stored in Firestore
        }));

        displayProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Function to display products based on the current page, category, and search query
function displayProducts(products) {
    const productContainer = document.getElementById('product-container');
    const paginationInfo = document.getElementById('page-info');

    // Clear previous products
    productContainer.innerHTML = '';

    // Filter products based on the current category and search query, ignoring case
    const filteredProducts = products.filter(product => {
        const productName = product.fields.name.stringValue.toLowerCase();
        const categoryMatch = currentCategory 
            ? product.fields.category.stringValue.toLowerCase() === currentCategory.toLowerCase() 
            : true;

        const searchMatch = searchQuery 
            ? productName.includes(searchQuery.toLowerCase()) 
            : true;

        return categoryMatch && searchMatch;
    });

    // Check if filtered products are empty
    if (filteredProducts.length === 0) {
        productContainer.innerHTML = `<p>No products found.</p>`;
        paginationInfo.textContent = ''; // Clear pagination info if no products
        return;
    }

    // Calculate the start and end index for slicing the filtered products
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end); // Slice the products array

    // Create product items for the current page
    paginatedProducts.forEach(product => {
        const productData = product.fields;
        const productId = product.name.split('/').pop(); // Get product ID from Firestore document name
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item'; // Class name for styling

        // Get the quantity of the product
        const quantity = productData.quantity && productData.quantity.integerValue ? parseInt(productData.quantity.integerValue, 10) : 0; // Default to 0 if quantity is undefined or missing // Assume quantity is stored in Firestore
        console.log(`Quantity: ${quantity}`);
        // Check if the product is already in the user's cart
        const isInCart = cart.some(item => item.productId.stringValue === productId);

        // Determine if the product is out of stock
        const isOutOfStock = quantity < 1;

        // Generate innerHTML based on stock status
        if (isOutOfStock) {
            productDiv.innerHTML = `
                <div class="product-image">
                    <img src="${productData.imageUrl.stringValue}" alt="${productData.name.stringValue}" />
                </div>
                <div class="product-info">
                    <h3 class="product-title">${productData.name.stringValue}</h3>
                    <p class="product-price">$${productData.price.doubleValue.toFixed(2)}</p>
                    <p class="product-description">${productData.description.stringValue}</p>
                    <p class="product-category">${productData.category.stringValue}</p>
                    <p class="out-of-stock">Out of Stock</p>
                </div>
            `;
        } else {
            const buttonText = isInCart ? 'Added to Cart' : 'Add to Cart';
            productDiv.innerHTML = `
                <div class="product-image">
                    <img src="${productData.imageUrl.stringValue}" alt="${productData.name.stringValue}" />
                </div>
                <div class="product-info">
                    <h3 class="product-title">${productData.name.stringValue}</h3>
                    <p class="product-price">$${productData.price.doubleValue.toFixed(2)}</p>
                    <p class="product-description">${productData.description.stringValue}</p>
                    <p class="product-category">${productData.category.stringValue}</p>
                    <button class="add-to-cart" onclick="addToCart('${productId}')">
                        ${buttonText}
                    </button>
                </div>
            `;
        }

        productContainer.appendChild(productDiv);
    });

    // Update pagination information
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    // Disable previous button on the first page
    document.getElementById('prev-page').disabled = currentPage === 1; 
    // Disable next button on the last page
    document.getElementById('next-page').disabled = currentPage === totalPages; 
}

// Function to change the current page with overlay effect
function changePage(direction) {
    const totalPages = Math.ceil((currentCategory || searchQuery ? products.filter(product => {
        const productName = product.fields.name.stringValue.toLowerCase();
        const categoryMatch = currentCategory 
            ? product.fields.category.stringValue.toLowerCase() === currentCategory.toLowerCase() 
            : true;

        const searchMatch = searchQuery 
            ? productName.includes(searchQuery.toLowerCase()) 
            : true;

        return categoryMatch && searchMatch;
    }) : products).length / productsPerPage); // Calculate total pages based on filtered products

    // Update currentPage based on direction
    const newPage = currentPage + direction; 
    if (newPage >= 1 && newPage <= totalPages) {
        const productContainer = document.getElementById('product-container');
        productContainer.style.opacity = 0; // Fade out effect

        // Delay the display of new products until fade-out is complete
        setTimeout(() => {
            currentPage = newPage; // Only update if within valid range
            displayProducts(products); // Re-display products for the new page
            productContainer.style.opacity = 1; // Fade in effect
        }, 300); // Matches CSS transition duration
    }
}

// Example HTML to trigger the changePage function (ensure these buttons exist in your HTML)
document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
document.getElementById('next-page').addEventListener('click', () => changePage(1));

// Function to filter products by category
function getCategory(category) {
    console.log(`Selected category: ${category}`); // Debugging log
    currentCategory = category; // Set the current category
    currentPage = 1; // Reset to the first page
    displayProducts(products); // Display products for the selected category
}

// Function to perform a search
function searchProducts() {
    const searchInput = document.getElementById('search-bar').value; // Get value from search input
    searchQuery = searchInput; // Set the current search query
    currentPage = 1; // Reset to the first page
    displayProducts(products); // Display products matching the search query
}

// Call displayProducts initially to show all products
displayProducts(products);

// Function to navigate to the cart page
function goToCartPage() {
    window.location.href = 'Addtocart.html';
}

// Sign out functionality
function signOut() {
    localStorage.removeItem('loggedInUserId');
    window.location.href = 'index.html';
}

// Attach button functionalities
document.getElementById('signout-btn').onclick = signOut;
document.getElementById('cart-btn').onclick = goToCartPage;

// Call fetchProducts on page load
window.onload = fetchProducts;
