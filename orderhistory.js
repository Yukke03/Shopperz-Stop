const API_KEY = 'AIzaSyA0j1H8_v-ZaVa25wZkDuOf_oEgz3xhb_o';  // Replace with your Firestore REST API Key
const PROJECT_ID = 'e-commerce-website-bf09a';  // Replace with your Firestore Project ID
const ORDERS_COLLECTION = 'orders';

 // Retrieve userId from localStorage
 const loggedInUserId = localStorage.getItem('loggedInUserId');
console.log('Retrieved userId from localStorage:', loggedInUserId);

if (!loggedInUserId) {
    console.error('No userId found in localStorage. Redirecting to login page...');
    alert('User not logged in. Redirecting to login page.');
    window.location.href = '#';  // Redirect to login if no user is logged in
}

// Fetch order data for a specific user
async function fetchOrdersForUser() {
    console.log('Fetching orders from Firestore...');
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${ORDERS_COLLECTION}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Error fetching orders from Firestore.');
        }
        const data = await response.json();
        console.log('Received data from Firestore:', data);
        
        const allOrders = data.documents || [];
        console.log('Filtering orders for userId:', loggedInUserId);
        
        const userOrders = allOrders.filter(order => order.fields.userId.stringValue === loggedInUserId);
        console.log('User orders found:', userOrders);
        
        return userOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

// Populate orders on the page
async function displayOrders() {
    console.log('Displaying orders for user...');
    const ordersContainer = document.getElementById('orders-container');
    const orders = await fetchOrdersForUser();

    if (orders.length === 0) {
        console.log('No orders found for the user.');
        ordersContainer.innerHTML = '<p>No orders found.</p>';
        return;
    }

    orders.forEach(order => {
        const products = order.fields.products.arrayValue.values;

        let productsTable = `
            <table>
                <thead>
                    <tr>
                        <th>Product Image</th>
                        <th>Product Name</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;

        products.forEach(product => {
            const imageUrl = product.mapValue.fields.imageUrl.stringValue;
            const name = product.mapValue.fields.name.stringValue;
            const quantity = product.mapValue.fields.quantity.integerValue;
            const price = product.mapValue.fields.price.doubleValue;
            const subtotal = product.mapValue.fields.subtotal.doubleValue;

            productsTable += `
                <tr>
                    <td><img src="${imageUrl}" alt="${name}" width="100"></td>
                    <td>${name}</td>
                    <td>${quantity}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${subtotal.toFixed(2)}</td>
                </tr>
            `;
        });

        productsTable += `</tbody></table>`;

        const orderDate = new Date(order.fields.orderDate.timestampValue).toLocaleDateString();
        const totalAmount = order.fields.totalAmount.doubleValue;
        const paymentMethod = order.fields.paymentMethod.stringValue;
        const shippingAddress = order.fields.shippingAddress.stringValue;

        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        orderCard.innerHTML = `
            <div class="order-details">
                <h3>Order Date: ${orderDate}</h3>
                <p><span>Total Amount:</span> $${totalAmount.toFixed(2)}</p>
                <p><span>Payment Method:</span> ${paymentMethod}</p>
                <p><span>Shipping Address:</span> ${shippingAddress}</p>
                ${productsTable}
            </div>
        `;

        ordersContainer.appendChild(orderCard);
    });
}

// Load the orders when the page loads
window.onload = displayOrders;