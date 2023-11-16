"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      href: '/builder/environment-variables'
    }}
    previous={{
      href: "/builder/your-first-plugin",
      title: "Your first plugin"
    }}
    next={{
      href: "/builder/plugin-structure",
      title: "Plugin Structure"
    }}>
    <Page />
  </Layout>

}