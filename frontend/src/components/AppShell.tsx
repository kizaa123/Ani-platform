"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { AppFooter } from "@/components/AppFooter";
import { RegistrationTopBar } from "@/components/RegistrationTopBar";
import { FarmerPortalLayout } from "@/components/FarmerSidebar";
import { PageLoader } from "@/components/LoadingPrimitives";
import { HandlerPortalLayout } from "@/components/HandlerSidebar";
import { BuyerPortalLayout } from "@/components/BuyerSidebar";
import { StaffPortalLayout } from "@/components/StaffSidebar";
import { ResearcherPortalLayout } from "@/components/ResearcherSidebar";
import { StudentPortalLayout } from "@/components/StudentSidebar";
import { isFarmer, isHandler, isBuyer, isStaff, isResearcher, isStudent } from "@/lib/types";

const PUBLIC_PATHS = ["/", "/login"];

const REGISTRATION_FLOW_PATHS = ["/register", "/complete-profile"];

function isRegistrationFlow(pathname: string) {
  return REGISTRATION_FLOW_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

function PortalWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (isRegistrationFlow(pathname)) {
    return (
      <>
        <RegistrationTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </>
    );
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return (
      <>
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <AppFooter />
      </>
    );
  }

  if (loading) {
    return <PageLoader />;
  }

  if (user && user.profileComplete === false) {
    return (
      <>
        <RegistrationTopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </>
    );
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

  if (user && isResearcher(user.roleId)) {
    return (
      <PortalWrap>
        <ResearcherPortalLayout>{children}</ResearcherPortalLayout>
      </PortalWrap>
    );
  }

  if (user && isStudent(user.roleId)) {
    return (
      <PortalWrap>
        <StudentPortalLayout>{children}</StudentPortalLayout>
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

  return <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>;
}
