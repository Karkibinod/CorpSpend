import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Cards from './components/Cards';
import Transactions from './components/Transactions';
import Receipts from './components/Receipts';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cards" element={<Cards />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="receipts" element={<Receipts />} />
      </Route>
    </Routes>
  );
}

export default App;

