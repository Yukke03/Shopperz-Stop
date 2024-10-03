const API_KEY = "AIzaSyA0j1H8_v-Za25wZkDuOf_oEgz3xhb_o";
const PROJECT_ID = "e-commerce-website-bf09a";
const ORDER_COLLECTION_ID = "orders";
const CART_COLLECTION_ID = "carts"; // Your carts collection
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/`;

document.addEventListener('DOMContentLoaded', () => {
    const orderTableBody = document.querySelector('#orderTable tbody');
    const orderSummary = document.querySelector('#orderSummary');

    // Fetch all order data from Firestore
    fetch(`${BASE_URL}${ORDER_COLLECTION_ID}?key=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const orders = data.documents;

            // Find the most recent order
            let latestOrder = null;
            let latestOrderDate = 0; // Initialize to zero for comparison

            orders.forEach(order => {
                const orderDate = order.fields.orderDate.timestampValue;

                // Compare timestamps to find the latest order
                if (new Date(orderDate).getTime() > latestOrderDate) {
                    latestOrderDate = new Date(orderDate).getTime();
                    latestOrder = order.fields;
                }
            });

            // Display the most recent order if found
            if (latestOrder) {
                const orderDate = latestOrder.orderDate.timestampValue;
                const paymentMethod = latestOrder.paymentMethod.stringValue;
                const shippingAddress = latestOrder.shippingAddress.stringValue;
                const status = latestOrder.status.stringValue;
                const userId = latestOrder.userId.stringValue; // Extract the userId directly from the latest order

                // Access totalAmount as a double value
                const totalAmount = latestOrder.totalAmount.doubleValue; // Use doubleValue for double types

                orderSummary.innerHTML = `
                    <p><strong>Order Date:</strong> ${new Date(orderDate).toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                    <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p> <!-- Format to two decimal places -->
                `;

                // Store the userId in local storage for future reference
                localStorage.setItem('currentUserId', userId); // Save the user ID in local storage

                // Populate the table with product details
                const products = latestOrder.products.arrayValue.values;
                products.forEach(product => {
                    const productName = product.mapValue.fields.name.stringValue;
                    const quantity = product.mapValue.fields.quantity.integerValue;
                    const price = product.mapValue.fields.price.doubleValue; // Use doubleValue for double types
                    const subtotal = product.mapValue.fields.subtotal.doubleValue; // Use doubleValue for double types
                    const imageUrl = product.mapValue.fields.imageUrl.stringValue;
                    const description = product.mapValue.fields.description.stringValue;

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><img src="${imageUrl}" alt="${productName}" style="width: 50px; height: auto;"></td>
                        <td>${productName}</td>
                        <td>${quantity}</td>
                        <td>$${price.toFixed(2)}</td> <!-- Format to two decimal places -->
                        <td>$${subtotal.toFixed(2)}</td> <!-- Format to two decimal places -->
                        <td>${description}</td>
                    `;
                    orderTableBody.appendChild(row);
                });
            } else {
                orderSummary.innerHTML = '<p>No orders found.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            orderSummary.innerHTML = '<p>Failed to load order details.</p>';
        });
});

// Function to get the user ID from the latest order and delete the user's cart
function deleteUserCartFromOrder() {
    const userId = localStorage.getItem('currentUserId'); // Get the user ID from local storage
    if (!userId) {
        console.error('No user ID found in local storage.'); // Log if no user ID is found
        return; // Exit if no user ID is available
    }
    deleteUserCart(userId); // Call function to delete user's cart based on user ID
}

// Function to delete all products in the user's cart
function deleteUserCart(userId) {
    console.log(`Fetching carts for user: ${userId}`); // Log the user ID being processed
    fetch(`${BASE_URL}${CART_COLLECTION_ID}?key=${API_KEY}`)
        .then(response => {
            if (!response.ok) {
                console.error('Failed to fetch carts:', response.statusText); // Log any fetch errors
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const carts = data.documents || []; // Handle case where documents might not exist
            console.log('Carts fetched:', carts); // Log all fetched carts

            // Iterate over each cart document
            carts.forEach(cart => {
                const docId = cart.name.split('/').pop(); // Get the document ID
                console.log(`Checking cart document ID: ${docId}`); // Log the document ID being checked

                // Check if the document ID starts with the user ID
                if (docId.startsWith(userId + '_')) {
                    console.log(`Attempting to delete cart document: ${docId}`); // Log the document ID being deleted
                    
                    // Delete the cart document
                    fetch(`${BASE_URL}${CART_COLLECTION_ID}/${docId}?key=${API_KEY}`, {
                        method: 'DELETE'
                    })
                    .then(deleteResponse => {
                        if (!deleteResponse.ok) {
                            return deleteResponse.json().then(err => {
                                console.error(`Failed to delete cart document: ${err.message}`); // Log the error message
                                throw new Error(`Failed to delete cart document: ${err.message}`);
                            });
                        }
                        console.log(`Successfully deleted cart document: ${docId}`); // Log success message
                    })
                    .catch(deleteError => {
                        console.error('Error deleting cart:', deleteError); // Log any errors that occur during deletion
                    });
                } else {
                    console.log(`Document ID ${docId} does not match user ID ${userId}.`); // Log if document ID does not match user ID
                }
            });

            // If no carts were found for the user
            if (carts.length === 0) {
                console.log(`No carts found for user: ${userId}`);
            }
        })
        .catch(error => {
            console.error('Error fetching carts:', error); // Log any errors during fetching
        });
}

// Redirect to shopping page (replace with your actual page)
function goBack() {
    deleteUserCartFromOrder(); // Call function to delete user's cart based on the most recent order
    window.location.href = 'Customerhomepage.html'; // Change to your shopping page URL
}
