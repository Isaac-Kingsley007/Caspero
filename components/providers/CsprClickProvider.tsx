'use client';

import React from 'react';
import {ClickUI, ClickProvider } from '@make-software/csprclick-ui';
import { CsprClickInitOptions, CONTENT_MODE } from '@make-software/csprclick-core-types';
import { ThemeProvider } from 'styled-components';

// CSPR.click initialization options
const clickOptions: CsprClickInitOptions = {
  appName: 'CasperGroup-Splits',
  appId: process.env.NEXT_PUBLIC_CSPR_CLICK_APP_ID || 'csprclick-template',
  providers: ['casper-wallet', 'ledger', 'torus-wallet', 'metamask-snap'],
  chainName: "casper-test",
  contentMode: CONTENT_MODE.IFRAME
};

// CSPR.click theme configuration
const csprClickTheme = {
  light: {
    // Add light theme styles if needed
  },
  dark: {
    // Add dark theme styles if needed
  },
};

interface CsprClickProviderProps {
  children: React.ReactNode;
}

export function CsprClickProvider({ children }: CsprClickProviderProps) {
  return (
    <ThemeProvider theme={csprClickTheme.dark}>
      <ClickProvider options={clickOptions}>
        <ClickUI/>
        {children}
      </ClickProvider>
    </ThemeProvider>
  );
}