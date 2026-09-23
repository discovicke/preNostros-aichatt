using System.Text.Json.Serialization;
using Bokcirkeln.Api.Data;
using Bokcirkeln.Api.Endpoints;
using Bokcirkeln.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<ChatServiceOptions>(builder.Configuration.GetSection("AzureOpenAI"));
builder.Services.AddScoped<ChatService>();

builder.Services.AddCors(options => options.AddPolicy("React", policy => policy
    .WithOrigins("http://localhost:5174")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("React");
app.MapConversationEndpoints();
app.MapBookEndpoints();

app.Run();
