import React from 'react';
import ReactCodeMirror from '@uiw/react-codemirror';
import Select from 'react-select'
import { linter } from "@codemirror/lint";
import { hoverTooltip } from "@codemirror/view";
import { json, jsonParseLinter, jsonLanguage } from '@codemirror/lang-json';
import { getExports, launchPlugin } from './services'
import { toast } from 'react-toastify'
import {
    jsonSchemaLinter,
    jsonSchemaHover,
    jsonCompletion,
    stateExtensions,
    handleRefresh
} from "codemirror-json-schema";


export class Run extends React.Component {

    state = {
        version: undefined,
        input: JSON.stringify({}, null, 4),
        functionName: 'execute',
        context: { value: "EmptyContext", label: "EmptyContext" },
        output: "",
        stdout: "",
        stderr: "",
        functions: []
    }

    componentDidMount() {
        this.readStateFromLocalStorage();
    }

    componentWillUnmount() {
        this.writeStateInLocalStorage();
    }

    readStateFromLocalStorage = () => {
        const rawState = localStorage.getItem(`${window.location.hostname}-runner`);

        try {
            const jsonState = JSON.parse(rawState);
            this.setState({
                ...jsonState
            })
        } catch (e) {
            console.log(e)
        }
    }

    writeStateInLocalStorage = () => {
        try {
            localStorage.setItem(`${window.location.hostname}-runner`, JSON.stringify(this.state, null, 4));
        } catch (_) { }
    }

    run = () => {
        const { input, functionName, version } = this.state;
        const plugin = this.props.plugins.find(p => p.pluginId === this.props.selectedPlugin.value);

        if (!version) {
            toast.error("You need to build your plugin before using the runner");
            return
        }

        this.setState({
            output: "",
            stdout: "",
            stderr: "",
        }, () => {

            launchPlugin(version.value, input, functionName.value, plugin?.type)
                .then(res => {
                    if (res.error) {
                        toast.error(res.error);
                        this.setState({
                            output: res.error
                        })
                    } else {
                        toast.success('Run done.', {
                            autoClose: 500
                        })
                        try {
                            this.setState({
                                output: JSON.stringify(JSON.parse(res.data), null, 4),
                                ...res
                            }, this.writeStateInLocalStorage)
                        } catch (err) {
                            this.setState({
                                output: res.data,
                                ...res
                            }, this.writeStateInLocalStorage)
                        }
                    }
                })
        })
    }

    fetchExports = () => {
        if (this.state.version)
            getExports(this.state.version.value)
                .then(functions => this.setState({
                    functions,
                    functionName: functions[0]
                }))
    }

    getConfigurationFile = () => {
        try {
            return JSON.parse(this.props.configFiles.find(configFile => configFile.filename === "config")?.content)
        } catch (err) {
            return { versions: [] }
        }
    }

    render() {
        const { input, functionName, output, stdout, stderr, functions, version } = this.state;
        const { plugins } = this.props;

        if (!this.props.selectedPlugin)
            return null

        const configurationFile = this.getConfigurationFile()

        return (
            <div style={{ flex: 1, marginTop: 75, maxWidth: 800 }} className="px-3"
                onKeyDown={e => e.stopPropagation()}>
                <SelectorStep
                    noOptionsMessageText="You need to build a first version of this plugin to use it"
                    title="Version"
                    id="selectedVersion"
                    value={version}
                    options={(configurationFile?.versions || [])?.map(v => ({ label: v.name, value: v.name }))}
                    onChange={version => {
                        this.setState({ version }, this.fetchExports)
                    }}
                />
                <SelectorStep
                    noOptionsMessageText="You need to select a version"
                    title="Function"
                    id="function"
                    value={functionName}
                    options={functions}
                    button={() => {
                        return <button type="button"
                            className='btn btn-secondary' onClick={this.fetchExports}>
                            <i className='fas fa-refresh' />
                        </button>
                    }}
                    onChange={functionName => this.setState({ functionName })}
                />
                <div className='mb-3'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <label htmlFor="input" className='form-label'>Input context</label>
                        <div className='w-50'>
                            {/* <Select
                                value={context}
                                options={Object.keys(Types)
                                    .filter(t => t.endsWith('Context'))
                                    .map(type => ({ value: type, label: type }))}
                                onChange={context => this.setState({
                                    context,
                                    input: JSON.stringify(rustTypesToJson(context.value), null, 4)
                                })}
                            /> */}
                        </div>
                    </div>
                    <ReactCodeMirror
                        id="input"
                        value={input}
                        extensions={[
                            json(),
                            linter(jsonParseLinter(), {
                                delay: 300
                            }),
                            linter(jsonSchemaLinter(), {
                                needsRefresh: handleRefresh,
                            }),
                            jsonLanguage.data.of({
                                autocomplete: jsonCompletion(),
                            }),
                            hoverTooltip(jsonSchemaHover()),
                            stateExtensions({})
                        ]}
                        onChange={input => {
                            this.setState({ input })
                        }}
                    />
                </div>
                <div className='mb-3'>
                    <button type="button" className='btn btn-success btn-sm' onClick={this.run} >
                        <i className='fas fa-play me-1' />
                        Run
                    </button>
                </div>
                <div className='mb-3'>
                    <label htmlFor="output" className='form-label'>Output</label>
                    <ReactCodeMirror
                        id="output"
                        value={(typeof output === 'string' || output instanceof String) ? output : JSON.stringify(output, null, 4)}
                        extensions={[]}
                        readOnly={true}
                        editable={false}
                        basicSetup={{
                            lineNumbers: false,
                            dropCursor: false
                        }}
                    />
                </div>
                <div className='mb-3'>
                    <label htmlFor="output" className='form-label'>Stdout</label>
                    <ReactCodeMirror
                        id="stdout"
                        value={stdout}
                        extensions={[]}
                        readOnly={true}
                        editable={false}
                        basicSetup={{
                            lineNumbers: false,
                            dropCursor: false
                        }}
                    />
                </div>
                <div className='mb-3'>
                    <label htmlFor="output" className='form-label'>Stderr</label>
                    <ReactCodeMirror
                        id="stderr"
                        value={stderr}
                        extensions={[]}
                        readOnly={true}
                        editable={false}
                        basicSetup={{
                            lineNumbers: false,
                            dropCursor: false
                        }}
                    />
                </div>
            </div >
        )
    }
}

function SelectorStep({ id, title, value, options, onChange, noOptionsMessageText, button = () => null }) {
    const Button = button
    return <div className='mb-3 bg-light p-2 ps-3 d-flex align-items-center gap-2'>
        <div className='d-flex align-items-center gap-2' style={{ minWidth: 100 }}>
            <label htmlFor="selectedPlugin" >{title}</label>
            {<Button />}
        </div>
        <Select
            id={id}
            className="w-100"
            value={value}
            options={options}
            onChange={onChange}
            isClearable
            components={{
                NoOptionsMessage: () => {
                    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center ' }}>
                        <span>{noOptionsMessageText}</span>
                    </div>
                }
            }}
        />
    </div>
}