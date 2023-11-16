"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - Getting started',
      href: '/builder/getting-started'
    }}
    previous={{
      href: "/builder/overview",
      title: "Builder - Overview"
    }}
    next={{
      href: "/builder/your-first-plugin",
      title: "Wasmo CLI"
    }}>
    <Page />
  </Layout>

}