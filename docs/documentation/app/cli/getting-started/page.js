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
      href: "/builder/ui",
      title: "Builder - UI"
    }}
    next={{
      href: "/cli/core-commands",
      title: "CLI - Core commands"
    }}>
    <Page />
  </Layout>

}