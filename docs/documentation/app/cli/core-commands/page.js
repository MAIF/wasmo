"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'CLI - Getting started',
      href: '/cli/getting-started'
    }}
    previous={{
      href: "/cli/getting-started",
      title: "CLI - Getting started"
    }}
    next={{
      href: "/cli/configuration-file",
      title: "CLI - Configuration fle"
    }}>
    <Page />
  </Layout>

}