import { Outlet } from "react-router-dom";
import { DashboardNavbar } from "../components/DashboardNavbar/DashboardNavbar";
import styles from "./DashboardLayout.module.css";

export const DashboardLayout: React.FC = () => {
  return (
    <div className={styles.wrap}>
      <DashboardNavbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};
