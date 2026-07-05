"use client";



import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthProvider";

import { Navbar } from "@/components/Navbar";

import { FarmerPortalLayout } from "@/components/FarmerSidebar";

import { HandlerPortalLayout } from "@/components/HandlerSidebar";

import { BuyerPortalLayout } from "@/components/BuyerSidebar";

import { StaffPortalLayout } from "@/components/StaffSidebar";

import { isFarmer, isHandler, isBuyer, isStaff } from "@/lib/types";



const PUBLIC_PATHS = ["/", "/login", "/register"];



function PortalWrap({ children }: { children: React.ReactNode }) {

  return (

    <div className="flex min-h-0 w-full flex-1 flex-col">

      {children}

    </div>

  );

}



export function AppShell({ children }: { children: React.ReactNode }) {

  const { user, loading } = useAuth();

  const pathname = usePathname();



  if (PUBLIC_PATHS.includes(pathname)) {

    return (

      <>

        <Navbar />

        <main className="flex-1">{children}</main>

      </>

    );

  }



  if (loading) {

    return <main className="flex-1">{children}</main>;

  }



  if (user && isFarmer(user.roleId)) {

    return (

      <PortalWrap>

        <FarmerPortalLayout>{children}</FarmerPortalLayout>

      </PortalWrap>

    );

  }



  if (user && isHandler(user.roleId)) {

    return (

      <PortalWrap>

        <HandlerPortalLayout>{children}</HandlerPortalLayout>

      </PortalWrap>

    );

  }



  if (user && isBuyer(user.roleId)) {

    return (

      <PortalWrap>

        <BuyerPortalLayout>{children}</BuyerPortalLayout>

      </PortalWrap>

    );

  }



  if (user && isStaff(user.roleId)) {

    return (

      <PortalWrap>

        <StaffPortalLayout>{children}</StaffPortalLayout>

      </PortalWrap>

    );

  }



  return <main className="flex-1">{children}</main>;

}


