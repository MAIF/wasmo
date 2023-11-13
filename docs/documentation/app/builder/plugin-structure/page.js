"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - Plugin Structure',
      href: '/builder/plugin-structure'
    }}
    next={{
      href: "/builder/ui",
      title: "User Interface"
    }}>
    <Page />
  </Layout>

}