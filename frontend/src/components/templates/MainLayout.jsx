import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../organisms/Navbar';
import Footer from '../organisms/Footer';
import './MainLayout.css';

const MainLayout = () => {
  return (
    <div className="main-layout">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
