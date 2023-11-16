"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - Plugin Structure',
      href: '/builder/plugin-structure'
    }}
    previous={{
      href: "/builder/your-first-plugin",
      title: "Your first plugin"
    }}
    next={{
      href: "/builder/ui",
      title: "User Interface"
    }}>
    <Page />
  </Layout>

}