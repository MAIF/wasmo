"use client"

import Layout from '@/components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      title: 'Wasmo - User Interface',
      href: '/builder/ui'
    }}
    previous={{
      href: "/builder/collaborate",
      title: "Collaborate"
    }}
    next={{
      href: "/cli/getting-started",
      title: "Getting started"
    }}>
    <Page />
  </Layout>

}