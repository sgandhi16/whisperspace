// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './Home'
import Thread from './Thread'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/thread/:id" element={<Thread />} />
    </Routes>
  )
}
