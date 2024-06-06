"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'FAQ',
      href: '/cli/examples'
    }}
    next={{
      href: "/builder/getting-started",
      title: "Builder - Getting started"
    }}>
    <Page />
  </Layout>

}