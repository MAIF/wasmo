import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ToastContainer } from 'react-toastify';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Link,
} from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import 'react-toastify/dist/ReactToastify.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <>
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          newestOnTop={false}
          closeOnClick
          pauseOnFocusLoss
          draggable
          theme="dark"
        />
        <App />
      </>
    ),
  }
]);

root.render(<RouterProvider router={router} />);
