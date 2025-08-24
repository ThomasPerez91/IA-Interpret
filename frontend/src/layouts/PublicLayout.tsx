import { Outlet } from "react-router-dom";
import { HomeNavbar } from "../components/HomeNavbar/HomeNavbar";

export const PublicLayout: React.FC = () => {
  return (
    <>
      <HomeNavbar />
      <Outlet />
    </>
  );
};
