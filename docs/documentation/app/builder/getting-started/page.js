"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - Getting started',
      href: '/builder/getting-started'
    }}
    next={{
      href: "/builder/your-first-plugin",
      title: "Wasmo CLI"
    }}>
    <Page />
  </Layout>

}