"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - User Interface',
      href: '/builder/ui'
    }}
    next={{
      href: "/cli/overview",
      title: "Wasmo CLI"
    }}>
    <Page />
  </Layout>

}