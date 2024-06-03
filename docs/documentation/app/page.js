"use client"

import Layout from '../components/Layout';
import Page from './_page.mdx';

export default function Home() {

  return <Layout
    metadata={{
      href: "/",
      title: "Wasmo - Overview"
    }}
    next={{
      href: "/builder/getting-started",
      title: "Getting started"
    }}>
    <Page />
  </Layout>
}