// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA0j1H8_v-ZaVa25wZkDuOf_oEgz3xhb_o",
  authDomain: "e-commerce-website-bf09a.firebaseapp.com",
  projectId: "e-commerce-website-bf09a",
  storageBucket: "e-commerce-website-bf09a.appspot.com",
  messagingSenderId: "1062536603582",
  appId: "1:1062536603582:web:cd2994f543201cd33fbbef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

function showMessage(message, divId) {
  var messageDiv = document.getElementById(divId);
  messageDiv.style.display = "block";
  messageDiv.innerHTML = message;
  messageDiv.style.opacity = 1;
  setTimeout(function() {
    messageDiv.style.opacity = 0;
  }, 5000);
}

// Handle email/password sign-up
const signUp = document.getElementById('submitSignUp');
signUp.addEventListener('click', (event) => {
  event.preventDefault();
  const email = document.getElementById('rEmail').value;
  const password = document.getElementById('rPassword').value;
  const firstName = document.getElementById('fName').value;
  const lastName = document.getElementById('lName').value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      const userData = {
        email: email,
        firstName: firstName,
        lastName: lastName
      };
      showMessage('Account Created Successfully', 'signUpMessage');
      const docRef = doc(db, "users", user.uid);
      setDoc(docRef, userData)
        .then(() => {
          window.location.href = 'index.html';
        })
        .catch((error) => {
          console.error("Error writing document", error);
        });
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode == 'auth/email-already-in-use') {
        showMessage('Email Address Already Exists !!!', 'signUpMessage');
      } else {
        showMessage('Unable to create User', 'signUpMessage');
      }
    });
});

// Handle email/password sign-in
const signIn = document.getElementById('submitSignIn');
signIn.addEventListener('click', (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      showMessage('Login is successful', 'signInMessage');
      const user = userCredential.user;
      localStorage.setItem('loggedInUserId', user.uid);
      window.location.href = 'Customerhomepage.html';
    })
    .catch((error) => {
      const errorCode = error.code;
      if (errorCode === 'auth/invalid-credential') {
        showMessage('Incorrect Email or Password', 'signInMessage');
      } else {
        showMessage('Account does not exist', 'signInMessage');
      }
    });
});

// Google Sign-In handler
const googleSignInButton = document.getElementById('googleSignInButton');
googleSignInButton.addEventListener('click', () => {
  const provider = new GoogleAuthProvider();

  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      const userEmail = user.email;

      // Check if user exists in Firestore
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, {
        email: user.email,
        firstName: user.displayName.split(' ')[0],  // Use Google's displayName
        lastName: user.displayName.split(' ')[1] || '' // Last name might be absent
      }, { merge: true }) // Merge to avoid overwriting existing data
      .then(() => {
        showMessage('Google Sign-In Successful', 'signInMessage');
        localStorage.setItem('loggedInUserId', user.uid);
        
        // Redirect based on email condition
        if (userEmail === 'yukkendran.dp@gmail.com') {
          window.location.href = 'homepage.html'; // Redirect to homepage if specific email matches
        } else {
          window.location.href = 'Customerhomepage.html'; // Redirect to another page if email doesn't match
        }
      })
      .catch((error) => {
        console.error("Error adding document: ", error);
      });
    })
    .catch((error) => {
      console.error('Error during Google Sign-In: ', error);
      showMessage('Google Sign-In failed', 'signInMessage');
    });
});
