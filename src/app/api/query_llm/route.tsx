// import { createClient } from '@/utils/supabase/server';
// import { OpenAIEmbeddings } from 'langchain_openai'; // Updated import
// import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
// import { NextResponse } from 'next/server';
// import { START, StateGraph } from 'langchain/graph';
// import { TypedDict } from 'langchain/types';
// import { Document } from 'langchain/document';
// import { hub } from 'langchain/hub';


// const openAiApiKey = process.env.OPENAI_API_KEY;
// const langsmithTracing = process.env.LANGSMITH_TRACING === 'true';
// const langsmithApiKey = process.env.LANGSMITH_API_KEY;

// // Define state for the application
// interface State extends TypedDict {
//     question: string;
//     context: Document[];
//     answer: string;
//   }
  
//   export async function POST(request: Request) {
//     const supabase = await createClient();
//     const body = await request.json();
//     const userQuery = body.query;
  
//     if (!userQuery) {
//       return NextResponse.json({ error: 'Query is required' }, { status: 400 });
//     }
  
//     // Initialize LangChain OpenAI model
//     const model = new OpenAI({
//       openAIApiKey: process.env.OPENAI_API_KEY, // Ensure this is set in your environment variables
//     });
  
//     // Query data directly from Supabase
//     const { data, error } = await supabase
//       .from('your_table_name') // Replace with your table name
//       .select('id, content') // Replace 'content' with the column containing text data
//       .order('id', { ascending: true });
  
//     if (error) {
//       console.error('Error querying Supabase:', error);
//       return NextResponse.json({ error: 'Failed to fetch data from Supabase' }, { status: 500 });
//     }
  
//     // Convert data into LangChain Document format
//     const docs = data.map((row: { id: string; content: string }) => new Document({ pageContent: row.content }));
  
//     // Chunk the documents
//     const textSplitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 1000,
//       chunkOverlap: 200,
//     });
//     const allSplits = textSplitter.splitDocuments(docs);
  
//     // Define prompt for question-answering
//     const prompt = await hub.pull('rlm/rag-prompt');
  
//     // Define application steps
//     async function retrieve(state: State): Promise<Partial<State>> {
//       // Perform similarity search manually (replace with your logic)
//       const retrievedDocs = allSplits.filter((doc) =>
//         doc.pageContent.toLowerCase().includes(state.question.toLowerCase())
//       );
//       return { context: retrievedDocs };
//     }
  
//     async function generate(state: State): Promise<Partial<State>> {
//       const docsContent = state.context.map((doc) => doc.pageContent).join('\n\n');
//       const messages = await prompt.invoke({ question: state.question, context: docsContent });
//       const response = await model.invoke(messages);
//       return { answer: response.content };
//     }
  
//     // Compile application and test
//     const graphBuilder = new StateGraph<State>().addSequence([retrieve, generate]);
//     graphBuilder.addEdge(START, 'retrieve');
//     const graph = graphBuilder.compile();
  
//     // Execute the graph
//     try {
//       const initialState: State = { question: userQuery, context: [], answer: '' };
//       const finalState = await graph.run(initialState);
//       return NextResponse.json({ answer: finalState.answer });
//     } catch (error) {
//       console.error('Error during RAG flow:', error);
//       return NextResponse.json({ error: 'Failed to process query' }, { status: 500 });
//     }
//   }