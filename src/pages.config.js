import Bills from './pages/Bills';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Vehicles from './pages/Vehicles';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Bills": Bills,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "Items": Items,
    "Maintenance": Maintenance,
    "Reports": Reports,
    "Vehicles": Vehicles,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};