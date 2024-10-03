const API_URL = `https://firestore.googleapis.com/v1/projects/e-commerce-website-bf09a/databases/(default)/documents/products`;
const API_KEY = "AIzaSyA0j1H8_v-ZaVa25wZkDuOf_oEgz3xhb_o";

let products = []; // Array to hold all products
let currentPage = 1; // Current page number
const productsPerPage = 8; // Number of products to display per page

// Function to upload image to Firebase Storage
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`https://firebasestorage.googleapis.com/v0/b/e-commerce-website-bf09a.appspot.com/o/images%2F${file.name}?alt=media&token=YOUR_FIREBASE_STORAGE_TOKEN`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to upload image');
    }

    return `https://firebasestorage.googleapis.com/v0/b/e-commerce-website-bf09a.appspot.com/o/images%2F${file.name}?alt=media`;
}

// Function to add a product
async function addProduct(event) {
    event.preventDefault(); // Prevent form submission

    const productName = document.getElementById('productName').value;
    const productPrice = document.getElementById('productPrice').value;
    const productDescription = document.getElementById('productDescription').value;
    const productQuantity = document.getElementById('productQuantity').value;
    const productCategory = document.getElementById('productCategory').value;
    const imageFile = document.getElementById('productImage').files[0];

    try {
        // Upload the image to Firebase Storage and get the image URL
        const imageUrl = await uploadImage(imageFile);

        // Create a document with a unique ID first
        const docResponse = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: {} }) // Create an empty document to generate an ID
        });

        if (!docResponse.ok) {
            const errorData = await docResponse.json();
            throw new Error('Failed to create document: ' + errorData.error.message);
        }

        const docData = await docResponse.json();
        const productId = docData.name.split('/').pop(); // Extract document ID from response

        // Prepare the product data with the generated product ID
        const productData = {
            fields: {
                id: { stringValue: productId }, // Set product ID as the document ID
                name: { stringValue: productName },
                price: { doubleValue: parseFloat(productPrice) },
                description: { stringValue: productDescription },
                quantity: { integerValue: parseInt(productQuantity) },
                category: { stringValue: productCategory },
                imageUrl: { stringValue: imageUrl }
            }
        };

        // Update the document with the product data
        const updateResponse = await fetch(`${API_URL}/${productId}?key=${API_KEY}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        // Check if the request was successful
        if (updateResponse.ok) {
            alert('Product added successfully!');
            document.getElementById('addProductForm').reset(); // Reset the form
            fetchProducts(); // Refresh the product list
        } else {
            const errorData = await updateResponse.json();
            alert('Failed to add product: ' + errorData.error.message);
        }
    } catch (error) {
        alert('Failed to add product: ' + error.message);
    }
}

// Function to fetch and display products
async function fetchProducts() {
    const response = await fetch(`${API_URL}?key=${API_KEY}`);
    if (response.ok) {
        const data = await response.json();
        products = data.documents || [];
        displayProducts(); // Call to display products
        setupPagination(); // Call to set up pagination
    } else {
        alert('Failed to fetch products');
    }
}


// Function to display products in containers
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = ''; // Clear previous products

    const categoryFilter = document.getElementById('categoryFilter').value.toLowerCase();
    const searchQuery = document.getElementById('productSearch').value.toLowerCase();

    // Filter products based on category and search query
    const filteredProducts = products.filter(product => {
        const productCategory = product.fields.category.stringValue.toLowerCase();
        const productName = product.fields.name.stringValue.toLowerCase();
        return (categoryFilter === '' || productCategory === categoryFilter) &&
            (searchQuery === '' || productName.includes(searchQuery));
    });

    // Implement pagination logic
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    paginatedProducts.forEach(product => {
        const productContainer = document.createElement('div');
        productContainer.className = 'product-container';

        productContainer.innerHTML = `
            <h3>${product.fields.name.stringValue}</h3>
            <img src="${product.fields.imageUrl.stringValue}" alt="${product.fields.name.stringValue}" style="width: 100%;">
            <p>Price: $${product.fields.price.doubleValue}</p>
            <p>Description: ${product.fields.description.stringValue}</p>
            <p>Quantity: ${product.fields.quantity.integerValue}</p>
            <p>Category: ${product.fields.category.stringValue}</p>
            <button onclick="showEditForm('${product.name}', '${product.fields.name.stringValue}', ${product.fields.price.doubleValue}, '${product.fields.description.stringValue}', ${product.fields.quantity.integerValue}, '${product.fields.category.stringValue}', '${product.fields.imageUrl.stringValue}')">Edit</button>
            <button onclick="confirmDelete('${product.fields.name.stringValue}')">Delete</button>
        `;

        productList.appendChild(productContainer);
    });
    
}

function setupPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = ''; // Clear previous pagination

    const totalPages = Math.ceil(products.length / productsPerPage);

    // Create previous button
    const prevButton = document.createElement('button');
    prevButton.innerText = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            displayProducts();
            setupPagination();
        }
    };
    paginationContainer.appendChild(prevButton);

    // Create page number buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        pageButton.onclick = () => {
            currentPage = i;
            displayProducts();
            setupPagination();
        };
        paginationContainer.appendChild(pageButton);
    }

    // Create next button
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayProducts();
            setupPagination();
        }
    };
    paginationContainer.appendChild(nextButton);
}

// Function to show edit form with pre-filled data
function showEditForm(productId, name, price, description, quantity, category, imageUrl) {
    document.getElementById('editProductId').value = productId.split('/').pop(); // Store document ID
    document.getElementById('editProductName').value = name;
    document.getElementById('editProductPrice').value = price;
    document.getElementById('editProductDescription').value = description;
    document.getElementById('editProductQuantity').value = quantity;
    document.getElementById('editProductCategory').value = category;

    // Show the edit form
    document.getElementById('editProductForm').style.display = 'block';
}

// Function to update a product
async function updateProduct(event) {
    event.preventDefault(); // Prevent form submission

    const productId = document.getElementById('editProductId').value;
    const productName = document.getElementById('editProductName').value;
    const productPrice = document.getElementById('editProductPrice').value;
    const productDescription = document.getElementById('editProductDescription').value;
    const productQuantity = document.getElementById('editProductQuantity').value;
    const productCategory = document.getElementById('editProductCategory').value;
    const imageFile = document.getElementById('editProductImage').files[0];

    try {
        let imageUrl = null;

        // If a new image is uploaded, upload it to Firebase Storage
        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        }

        // Fetch the existing product data
        const existingProductResponse = await fetch(`${API_URL}/${productId}?key=${API_KEY}`);
        if (!existingProductResponse.ok) {
            throw new Error('Failed to fetch existing product data');
        }
        const existingProductData = await existingProductResponse.json();

        // Check if existing product data has fields
        if (!existingProductData.fields) {
            throw new Error('No fields found in existing product data');
        }

        // Prepare the updated product data, including the id field
        const updatedProductData = {
            fields: {
                id: { stringValue: existingProductData.fields.id ? existingProductData.fields.id.stringValue : '' }, // Keep the existing id
                name: { stringValue: productName },
                price: { doubleValue: parseFloat(productPrice) },
                description: { stringValue: productDescription },
                quantity: { integerValue: parseInt(productQuantity) },
                category: { stringValue: productCategory },
                imageUrl: { stringValue: imageUrl || (existingProductData.fields.imageUrl ? existingProductData.fields.imageUrl.stringValue : '') } // Use old image if not updating
            }
        };

        // Update the product data
        const updateResponse = await fetch(`${API_URL}/${productId}?key=${API_KEY}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProductData)
        });

        // Check if the request was successful
        if (updateResponse.ok) {
            alert('Product updated successfully!');
            document.getElementById('editProductForm').reset(); // Reset the form
            fetchProducts(); // Refresh the product list
            document.getElementById('editProductForm').style.display = 'none'; // Hide edit form
        } else {
            const errorData = await updateResponse.json();
            alert('Failed to update product: ' + errorData.error.message);
        }
    } catch (error) {
        alert('Failed to update product: ' + error.message);
    }
}

function confirmDelete(productName) {
    if (confirm('Are you sure you want to delete this product?')) {
        softDeleteProduct(productName);
    }
}

// Function to soft delete a product
async function softDeleteProduct(productName) {
    try {
        // Fetch the product data by name
        const response = await fetch(`${API_URL}?key=${API_KEY}`);
        const data = await response.json();
        const products = data.documents || [];

        // Find the product with the matching name
        const productToDelete = products.find(product => product.fields.name.stringValue === productName);

        if (!productToDelete) {
            alert('Product not found');
            return;
        }

        const productId = productToDelete.name.split('/').pop();

        // Move product to backup collection
        const backupResponse = await fetch(`https://firestore.googleapis.com/v1/projects/e-commerce-website-bf09a/databases/(default)/documents/deletedProducts?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: productToDelete.fields }) // Move entire product to backup
        });

        if (!backupResponse.ok) {
            const errorData = await backupResponse.json();
            throw new Error('Failed to backup product: ' + errorData.error.message);
        }

        // Delete the product from the main collection
        const deleteResponse = await fetch(`${API_URL}/${productId}?key=${API_KEY}`, {
            method: 'DELETE'
        });

        if (deleteResponse.ok) {
            alert('Product deleted successfully!');
            fetchProducts(); // Refresh the product list
        } else {
            const errorData = await deleteResponse.json();
            throw new Error('Failed to delete product: ' + errorData.error.message);
        }
    } catch (error) {
        alert('Failed to delete product: ' + error.message);
    }
}

// Event listeners
document.getElementById('addProductForm').addEventListener('submit', addProduct);
document.getElementById('editProductForm').addEventListener('submit', updateProduct);
document.getElementById('categoryFilter').addEventListener('change', fetchProducts);
document.getElementById('productSearch').addEventListener('input', fetchProducts);

// Fetch products on page load
fetchProducts();




