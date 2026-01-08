import Bills from './pages/Bills';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import Maintenance from './pages/Maintenance';
import Vehicles from './pages/Vehicles';
import Items from './pages/Items';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Bills": Bills,
    "Calendar": Calendar,
    "Dashboard": Dashboard,
    "Maintenance": Maintenance,
    "Vehicles": Vehicles,
    "Items": Items,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};