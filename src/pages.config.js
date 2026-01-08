import Bills from './pages/Bills';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Maintenance from './pages/Maintenance';
import Vehicles from './pages/Vehicles';
import VehicleCosts from './pages/VehicleCosts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Bills": Bills,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "Items": Items,
    "Maintenance": Maintenance,
    "Vehicles": Vehicles,
    "VehicleCosts": VehicleCosts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};