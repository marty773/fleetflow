import Calendar from './pages/Calendar';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Calendar": Calendar,
}

export const pagesConfig = {
    mainPage: "Calendar",
    Pages: PAGES,
    Layout: __Layout,
};