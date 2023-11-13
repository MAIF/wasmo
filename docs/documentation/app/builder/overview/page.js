"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - Overview',
      href: '/builder/overview'
    }}
    next={{
      href: "/builder/getting-started",
      title: "Getting started"
    }}>
    <Page />
  </Layout>

}