const checkoutItemsBody = document.getElementById('checkout-items-body');
const totalPriceElement = document.getElementById('total-price');
const confirmPurchaseButton = document.getElementById('confirm-purchase');
const backToCartButton = document.getElementById('back-to-cart');
const applyVoucherButton = document.getElementById('apply-voucher');
const voucherMessage = document.getElementById('voucher-message');

const API_KEY = "AIzaSyA0j1H8_v-Za25wZkDuOf_oEgz3xhb_o";  // Replace with your actual API key
const PROJECT_ID = "e-commerce-website-bf09a";  // Replace with your actual project ID
const CART_COLLECTION_ID = "carts"; // Your cart collection name
const ORDER_COLLECTION_ID = "orders"; // Your orders collection name

let totalAmount = 0;
let cartItems = []; // Initialize an array to store cart items

// Fetch cart items from Firestore using REST API
async function fetchCartItems() {
  const userId = localStorage.getItem('loggedInUserId'); // Assuming user ID is stored in localStorage
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${CART_COLLECTION_ID}?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.documents) {
      // Filter for documents belonging to this user
      cartItems = data.documents
        .filter(doc => doc.name.includes(userId))
        .map(doc => ({
          id: doc.name.split('/').pop(),
          name: doc.fields.name.stringValue,
          price: parseFloat(doc.fields.price.doubleValue),
          quantity: parseInt(doc.fields.quantity.integerValue),
          imageUrl: doc.fields.imageUrl.stringValue,
          description: doc.fields.description.stringValue // Add description field
        }));

      if (cartItems.length > 0) {
        displayCheckoutItems(cartItems);
      } else {
        checkoutItemsBody.innerHTML = '<tr><td colspan="5">Your cart is empty.</td></tr>';
      }
    } else {
      checkoutItemsBody.innerHTML = '<tr><td colspan="5">Your cart is empty.</td></tr>';
    }
  } catch (error) {
    console.error('Error fetching cart items:', error);
    checkoutItemsBody.innerHTML = '<tr><td colspan="5">Error loading cart items.</td></tr>';
  }
}

// Display checkout items in a table
function displayCheckoutItems(items) {
  checkoutItemsBody.innerHTML = '';  // Clear previous content
  totalAmount = 0;

  items.forEach((item) => {
    const subtotal = item.price * item.quantity;
    const checkoutRow = document.createElement('tr');
    checkoutRow.innerHTML = `
      <td><img src="${item.imageUrl}" alt="${item.name}"></td>
      <td>${item.name}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>${item.quantity}</td>
      <td>$${subtotal.toFixed(2)}</td>
    `;
    checkoutItemsBody.appendChild(checkoutRow);
    totalAmount += subtotal;
  });

  totalPriceElement.textContent = totalAmount.toFixed(2);
}

// Confirm purchase
confirmPurchaseButton.addEventListener('click', async () => {
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const shippingAddress = document.getElementById('address').value;
    
    if (!shippingAddress) {
      alert('Please enter a shipping address.');
      return;
    }
  
    const userId = localStorage.getItem('loggedInUserId');
    console.log('Logged-in User ID:', userId);
    localStorage.setItem('loggedInUserId', userId); // Assuming user ID is stored in localStorage
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${ORDER_COLLECTION_ID}?key=${API_KEY}`;
  
    // Collect product details to include in the order
    const products = cartItems.map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: (item.price * item.quantity).toFixed(2), // Optional: Include subtotal for each item
      imageUrl: item.imageUrl, // Include image URL
      description: item.description// Include product description
    }));
  
    const orderData = {
      fields: {
        userId: { stringValue: userId },
        totalAmount: { doubleValue: totalAmount },
        paymentMethod: { stringValue: paymentMethod },
        shippingAddress: { stringValue: shippingAddress },
        status: { stringValue: 'Order Confirmed' },
        orderDate: { timestampValue: new Date().toISOString() },
        products: { arrayValue: { values: products.map(product => ({
            mapValue: { fields: {
                productId: { stringValue: product.productId }, // Add product ID
                name: { stringValue: product.name },
                price: { doubleValue: product.price },
                quantity: { integerValue: product.quantity },
                subtotal: { doubleValue: parseFloat(product.subtotal) },
                imageUrl: { stringValue: product.imageUrl }, // Add image URL
                description: { stringValue: product.description },
              }
            }
          })) }
        }
      }
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
  
      if (!response.ok) {
        throw new Error('Failed to process the order.');
      }
  
      const orderResponse = await response.json();
      
      // Update product quantities in products collection
      await updateProductQuantities();
  
      // Add credits for the user
      await addCredits(userId, cartItems.length);

  
      alert(`Order confirmed!\nTotal Amount: $${totalAmount.toFixed(2)}\nPayment Method: ${paymentMethod}`);
      console.log('Order response:', orderResponse);
  
    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Error confirming your order. Please try again.');
    }

    window.location.href = 'orderConfirmation.html'; // Change to your desired page
  });
  
  async function updateProductQuantities(userId) {
    // URL to fetch the user's orders
    const orderUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${ORDER_COLLECTION_ID}?key=${API_KEY}`;

    try {
        // Fetch the user's orders
        const orderResponse = await fetch(orderUrl);
        if (!orderResponse.ok) {
            throw new Error('Failed to fetch orders.');
        }

        const orderData = await orderResponse.json();
        const orders = orderData.documents;

        // Check if orders exist for the user
        if (!orders || orders.length === 0) {
            console.error(`No orders found for user ID: ${userId}`);
            return; // Exit if no orders
        }

        // Find the latest order using the orderDate field
        let latestOrder = null;
        for (const order of orders) {
            if (!latestOrder || order.fields.orderDate.timestampValue > latestOrder.fields.orderDate.timestampValue) {
                latestOrder = order;
            }
        }

        // If no latest order is found, exit
        if (!latestOrder) {
            console.error('No valid orders found.');
            return;
        }

        // Get products from the latest order
        const products = latestOrder.fields.products.arrayValue.values;

        // Loop through the products in the latest order
        for (const product of products) {
            const productId = product.mapValue.fields.productId.stringValue; // Extract productId
            const quantity = product.mapValue.fields.quantity.integerValue; // Extract quantity

            // Remove the user ID prefix to get the actual product ID
            const actualProductId = productId.split('_')[1];

            // Fetch the product to get current quantity and other fields
            const productUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${actualProductId}?key=${API_KEY}`;
            const productResponse = await fetch(productUrl);
            if (!productResponse.ok) {
                throw new Error(`Error fetching product data for ID: ${actualProductId}`);
            }

            const productData = await productResponse.json();
            const currentQuantity = productData.fields.quantity.integerValue;

            // Calculate the new quantity
            const newQuantity = currentQuantity - quantity;

            // Update only the quantity field in Firestore
            await updateProductQuantityInFirestore(actualProductId, newQuantity, productData);
        }
    } catch (error) {
        console.error('Error updating product quantities:', error);
    }
}

// Function to update product quantity in Firestore
async function updateProductQuantityInFirestore(productId, newQuantity, productData) {
    const productUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${productId}?key=${API_KEY}`;
    
    // Create the update data object
    const updateData = {
        fields: {
            quantity: { integerValue: newQuantity },
            // Include other fields to retain them in the document
        }
    };

    // Retain all existing fields by iterating over productData.fields
    for (const [key, value] of Object.entries(productData.fields)) {
        if (key !== "quantity") { // Ensure we don't overwrite quantity
            updateData.fields[key] = value; // Keep all other fields
        }
    }

    const response = await fetch(productUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        throw new Error(`Error updating product quantities for ID: ${productId}`);
    }

    console.log(`Product quantity updated for ID: ${productId}. New quantity: ${newQuantity}`);
}

// Add or update credits in the 'credits' collection, using userId as the document ID
async function addCredits(userId, numProductsBought) {
    const creditsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/credits/${userId}?key=${API_KEY}`;
  
    try {
        // Check if the user already has a credits document
        const response = await fetch(creditsUrl);
        
        if (response.ok) {
            // User already has a credits document, so update it
            const creditData = await response.json();
            const currentCredits = parseInt(creditData.fields.credits.integerValue, 10); // Ensure the credits are treated as integers
            
            // Add new credits based on the number of products bought
            const newCredits = currentCredits + (numProductsBought * 10); // 10 credits per product bought
  
            // Update the existing credits document
            const updateData = {
                fields: {
                    credits: { integerValue: newCredits }, // Ensure it's an integer
                    lastUpdated: { timestampValue: new Date().toISOString() } // Optional: track when credits were last updated
                }
            };
  
            await fetch(creditsUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
  
        } else if (response.status === 404) {
            // User doesn't have a credits document, create a new one
            const creditsData = {
                fields: {
                    userId: { stringValue: userId },
                    credits: { integerValue: numProductsBought * 10 }, // 10 credits per product bought
                    awardedDate: { timestampValue: new Date().toISOString() }
                }
            };
  
            // Create a new document with userId as the document ID
            await fetch(creditsUrl, {
                method: 'PATCH',  // Use PATCH to create the document if it doesn't exist
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(creditsData)
            });
        } else {
            throw new Error('Error fetching credits document');
        }
  
    } catch (error) {
        console.error('Error adding or updating credits:', error);
    }
}

// Go back to cart
backToCartButton.addEventListener('click', () => {
  window.location.href = 'addtocart.html';  // Redirect to your cart page
});

// Function to get user's credits from Firestore
async function getUserCredits(userId) {
  try {
    const creditsResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/credits/${userId}?key=${API_KEY}`);
    const creditsData = await creditsResponse.json();

    // Assuming credits are stored as an integer in a field called 'credits'
    const userCredits = parseInt(creditsData.fields.credits.integerValue, 10);
    return { userCredits, creditsData }; // Return both credits and full document data
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return { userCredits: 0, creditsData: {} }; // Default value and empty document if something goes wrong
  }
}

// Display user's available credits when the page loads
window.addEventListener('DOMContentLoaded', async () => {
  const userId = localStorage.getItem('loggedInUserId'); // Replace with actual user ID logic

  // Fetch user's credit value and display it
  const { userCredits } = await getUserCredits(userId);

  // Show a message about available credits (above or near the voucher input field)
  if (userCredits > 1000) {
    voucherMessage.textContent = `You have ${userCredits} credits available. You can use up to 1000 credits.`;
  } else if (userCredits > 0) {
    voucherMessage.textContent = `You have ${userCredits} credits available to use.`;
  } else {
    voucherMessage.textContent = `You have no credits available.`;
  }
});

// Apply voucher or credits
applyVoucherButton.addEventListener('click', async () => {
  const voucherCode = document.getElementById('voucher-code').value;
  const userId = localStorage.getItem('loggedInUserId'); // Replace with actual user ID logic

  // Fetch user's credit value and the entire document data again
  const { userCredits, creditsData } = await getUserCredits(userId);

  // Disable the button after clicking to prevent multiple clicks
  applyVoucherButton.disabled = true;

  // Check if the voucher code is "SAVE10"
  if (voucherCode === "SAVE10") {
    const discount = totalAmount * 0.10; // 10% discount
    totalAmount -= discount;
    totalPriceElement.textContent = totalAmount.toFixed(2);
    voucherMessage.textContent = `Voucher applied! You saved $${discount.toFixed(2)}.`;

  // Check if the voucher code is a valid credit value within limits
  } else if (!isNaN(voucherCode) && parseInt(voucherCode, 10) <= userCredits && parseInt(voucherCode, 10) <= 1000) {
    const creditDiscount = parseFloat(voucherCode);

    // Deduct the entered credits from the total amount
    totalAmount -= creditDiscount;
    totalPriceElement.textContent = totalAmount.toFixed(2);
    voucherMessage.textContent = `You used $${creditDiscount.toFixed(2)} of your credits.`;

    // Calculate remaining credits
    const remainingCredits = userCredits - creditDiscount;

    // Proceed to update the credits in Firestore and redirect on checkout click
    document.getElementById('confirm-purchase').addEventListener('click', async () => {
      // Update the credits in Firestore, keeping the lastUpdated field
      const updateCreditsPayload = {
        fields: {
          credits: {
            integerValue: remainingCredits.toString()
          },
          lastUpdated: creditsData.fields.lastUpdated // Ensure other fields are preserved
        }
      };

      try {
        await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/credits/${userId}?key=${API_KEY}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateCreditsPayload)
        });
        console.log('Credits updated successfully.');
      } catch (error) {
        console.error('Error updating credits:', error);
      }

      // Redirect to the order confirmation page
      window.location.href = 'orderconfirmation.html';
    });

  } else if (!isNaN(voucherCode)) {
    voucherMessage.textContent = `Invalid credit amount. You can only apply up to $1000 from your credits, and you have $${userCredits} available.`;
  } else {
    voucherMessage.textContent = 'Invalid voucher code.';
  }
});

// Fetch cart items on page load
window.onload = fetchCartItems;
