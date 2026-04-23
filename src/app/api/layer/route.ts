export async function GET() {
    const url = process.env.API_URL

    if (url)
        return fetch(url)
    else
        return Response.json("URL not set", { status: 500 })
}