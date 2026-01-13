-- =====================================================
-- ADD RESTAURANT MENU POLOTNO TEMPLATE
-- =====================================================
-- Adds a fully editable restaurant menu template with
-- Polotno JSON design data for the layout editor.
-- =====================================================

INSERT INTO public.layout_templates (
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  width,
  height,
  is_featured,
  is_active,
  data
) VALUES (
  'Restaurant Menu - Elegant',
  'Professional restaurant menu template with sections for starters, salads, main courses, desserts, and drinks. Fully editable with warm cream background and orange accents.',
  'Restaurant',
  '16_9',
  '/templates/restaurant-menu/menu-design.svg',
  '#F0E4D7',
  1920,
  1080,
  true,
  true,
  '{
    "width": 1920,
    "height": 1080,
    "fonts": [
      {"fontFamily": "Poppins", "url": "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf"},
      {"fontFamily": "Fredericka the Great", "url": "https://fonts.gstatic.com/s/frederickathegreate/v21/9Bt33CxNwt7aIbN5NgRQdCYhGn8BKnQ.ttf"}
    ],
    "pages": [{
      "id": "restaurant-menu-page",
      "background": "#F0E4D7",
      "children": [
        {"id": "bg-shape-1", "type": "svg", "x": -100, "y": -100, "width": 500, "height": 400, "rotation": 0, "opacity": 0.4, "src": "data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 200 200''%3E%3Cpath fill=''%23E8D5C4'' d=''M45.3,-51.2C58.3,-40.8,68.4,-25.6,71.2,-8.7C74,8.2,69.5,26.7,58.6,39.6C47.7,52.5,30.4,59.7,12.4,63.2C-5.6,66.7,-24.3,66.5,-40.1,58.5C-55.9,50.5,-68.8,34.7,-73.1,16.5C-77.4,-1.7,-73.1,-22.3,-62.1,-37.3C-51.1,-52.3,-33.4,-61.7,-15.8,-64.5C1.8,-67.3,32.3,-61.6,45.3,-51.2Z'' transform=''translate(100 100)''/%3E%3C/svg%3E", "name": "Background Shape 1"},
        {"id": "bg-shape-2", "type": "svg", "x": 1500, "y": 700, "width": 500, "height": 400, "rotation": 180, "opacity": 0.4, "src": "data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 200 200''%3E%3Cpath fill=''%23E8D5C4'' d=''M45.3,-51.2C58.3,-40.8,68.4,-25.6,71.2,-8.7C74,8.2,69.5,26.7,58.6,39.6C47.7,52.5,30.4,59.7,12.4,63.2C-5.6,66.7,-24.3,66.5,-40.1,58.5C-55.9,50.5,-68.8,34.7,-73.1,16.5C-77.4,-1.7,-73.1,-22.3,-62.1,-37.3C-51.1,-52.3,-33.4,-61.7,-15.8,-64.5C1.8,-67.3,32.3,-61.6,45.3,-51.2Z'' transform=''translate(100 100)''/%3E%3C/svg%3E", "name": "Background Shape 2"},
        {"id": "food-img-1", "type": "image", "x": 30, "y": 50, "width": 220, "height": 220, "src": "https://img.freepik.com/free-photo/top-view-baked-chicken-potatoes-pan-with-pickles_140725-5953.jpg?w=400", "cornerRadius": 110, "name": "Food Photo - Top Left"},
        {"id": "food-img-2", "type": "image", "x": 80, "y": 750, "width": 200, "height": 200, "src": "https://img.freepik.com/free-photo/plate-with-fresh-salad_23-2148303584.jpg?w=400", "cornerRadius": 100, "name": "Food Photo - Bottom Left"},
        {"id": "food-img-3", "type": "image", "x": 1620, "y": 30, "width": 260, "height": 260, "src": "https://img.freepik.com/free-photo/top-view-thanksgiving-roasted-chicken-dish-with-lemon-slices_23-2148637915.jpg?w=400", "cornerRadius": 130, "name": "Food Photo - Top Right"},
        {"id": "food-img-4", "type": "image", "x": 1620, "y": 780, "width": 240, "height": 240, "src": "https://img.freepik.com/free-photo/top-view-grilled-chicken-peas-pan-with-herbs_140725-5964.jpg?w=400", "cornerRadius": 120, "name": "Food Photo - Bottom Right"},
        {"id": "menu-title", "type": "text", "x": 100, "y": 100, "width": 250, "height": 120, "text": "MENU", "fontSize": 72, "fontFamily": "Fredericka the Great", "fontWeight": "normal", "fill": "#E8943B", "align": "center", "name": "Menu Title"},
        {"id": "restaurant-badge", "type": "figure", "x": 120, "y": 215, "width": 200, "height": 40, "fill": "#E8943B", "name": "Restaurant Badge Background"},
        {"id": "restaurant-text", "type": "text", "x": 120, "y": 220, "width": 200, "height": 35, "text": "RESTAURANT", "fontSize": 20, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#FFFFFF", "align": "center", "name": "Restaurant Text"},
        {"id": "restaurant-desc", "type": "text", "x": 60, "y": 270, "width": 320, "height": 80, "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris interdum est risus.", "fontSize": 12, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#666666", "align": "center", "lineHeight": 1.4, "name": "Restaurant Description"},
        {"id": "starters-title", "type": "text", "x": 60, "y": 360, "width": 200, "height": 35, "text": "STARTERS", "fontSize": 24, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#E8943B", "name": "Starters Title"},
        {"id": "starter-1-name", "type": "text", "x": 60, "y": 400, "width": 280, "height": 25, "text": "TOMATO SOUP . . . . . . . . . . . . . . . . . .  $ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Starter 1"},
        {"id": "starter-1-desc", "type": "text", "x": 60, "y": 425, "width": 280, "height": 35, "text": "Fresh tomatoes with herbs and cream", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Starter 1 Description"},
        {"id": "starter-2-name", "type": "text", "x": 60, "y": 465, "width": 280, "height": 25, "text": "CHICKEN SOUP . . . . . . . . . . . . . . . . .  $ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Starter 2"},
        {"id": "starter-2-desc", "type": "text", "x": 60, "y": 490, "width": 280, "height": 25, "text": "Homemade chicken broth with vegetables", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "name": "Starter 2 Description"},
        {"id": "starter-3-name", "type": "text", "x": 60, "y": 520, "width": 280, "height": 25, "text": "CRISPY CORN . . . . . . . . . . . . . . . . . .  $ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Starter 3"},
        {"id": "starter-3-desc", "type": "text", "x": 60, "y": 545, "width": 280, "height": 35, "text": "Golden fried corn with special seasoning", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Starter 3 Description"},
        {"id": "salads-title", "type": "text", "x": 60, "y": 610, "width": 200, "height": 35, "text": "SALADS", "fontSize": 24, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#E8943B", "name": "Salads Title"},
        {"id": "salad-1-name", "type": "text", "x": 60, "y": 650, "width": 300, "height": 25, "text": "GUACAMOLE SALAD . . . . . . . . . . . . .  $ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Salad 1"},
        {"id": "salad-1-desc", "type": "text", "x": 60, "y": 675, "width": 280, "height": 25, "text": "Fresh avocado with lime and cilantro", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "name": "Salad 1 Description"},
        {"id": "salad-2-name", "type": "text", "x": 60, "y": 705, "width": 300, "height": 25, "text": "CHICKEN SALAD . . . . . . . . . . . . . . . .  $ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Salad 2"},
        {"id": "salad-2-desc", "type": "text", "x": 60, "y": 730, "width": 280, "height": 35, "text": "Grilled chicken with mixed greens", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Salad 2 Description"},
        {"id": "main-courses-title", "type": "text", "x": 480, "y": 50, "width": 280, "height": 35, "text": "MAIN COURSES", "fontSize": 24, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#E8943B", "name": "Main Courses Title"},
        {"id": "main-1-name", "type": "text", "x": 480, "y": 90, "width": 350, "height": 25, "text": "GRILLED FISH AND POTATOES . . . . . . . . .$ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Main Course 1"},
        {"id": "main-1-desc", "type": "text", "x": 480, "y": 115, "width": 320, "height": 35, "text": "Fresh catch with roasted potatoes", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Main Course 1 Description"},
        {"id": "main-2-name", "type": "text", "x": 480, "y": 155, "width": 350, "height": 25, "text": "CHICKEN AND RICE . . . . . . . . . . . . . . . . . .$ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Main Course 2"},
        {"id": "main-2-desc", "type": "text", "x": 480, "y": 180, "width": 320, "height": 35, "text": "Seasoned chicken with fluffy rice", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Main Course 2 Description"},
        {"id": "main-3-name", "type": "text", "x": 480, "y": 220, "width": 350, "height": 25, "text": "TURKEY AND HAM PIE . . . . . . . . . . . . . . . .$ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Main Course 3"},
        {"id": "main-3-desc", "type": "text", "x": 480, "y": 245, "width": 320, "height": 35, "text": "Homemade pie with flaky crust", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Main Course 3 Description"},
        {"id": "main-4-name", "type": "text", "x": 480, "y": 285, "width": 350, "height": 25, "text": "VEGETABLE PASTA  . . . . . . . . . . . . . . . . . .$ 10.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Main Course 4"},
        {"id": "main-4-desc", "type": "text", "x": 480, "y": 310, "width": 320, "height": 35, "text": "Fresh pasta with seasonal vegetables", "fontSize": 11, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#888888", "lineHeight": 1.3, "name": "Main Course 4 Description"},
        {"id": "desserts-title", "type": "text", "x": 480, "y": 380, "width": 200, "height": 35, "text": "DESSERTS", "fontSize": 24, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#E8943B", "name": "Desserts Title"},
        {"id": "dessert-1-name", "type": "text", "x": 480, "y": 420, "width": 320, "height": 25, "text": "FRUIT AND CREAM  . . . . . . . . . . . . . . . . . $ 5.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Dessert 1"},
        {"id": "dessert-2-name", "type": "text", "x": 480, "y": 455, "width": 320, "height": 25, "text": "ICE CREAM . . . . . . . . . . . . . . . . . . . . . . . . $ 5.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Dessert 2"},
        {"id": "dessert-3-name", "type": "text", "x": 480, "y": 490, "width": 320, "height": 25, "text": "CHOCOLATE CAKE . . . . . . . . . . . . . . . . . . $ 5.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Dessert 3"},
        {"id": "dessert-4-name", "type": "text", "x": 480, "y": 525, "width": 320, "height": 25, "text": "STRAWBERRY CAKE . . . . . . . . . . . . . . . . . $ 5.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Dessert 4"},
        {"id": "dessert-5-name", "type": "text", "x": 480, "y": 560, "width": 320, "height": 25, "text": "APPLE PIE . . . . . . . . . . . . . . . . . . . . . . . . . $ 5.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Dessert 5"},
        {"id": "drinks-title", "type": "text", "x": 900, "y": 170, "width": 200, "height": 35, "text": "DRINKS", "fontSize": 24, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#E8943B", "name": "Drinks Title"},
        {"id": "drink-1-name", "type": "text", "x": 900, "y": 210, "width": 280, "height": 25, "text": "MINERAL WATER . . . . . . . . . $ 2.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Drink 1"},
        {"id": "drink-2-name", "type": "text", "x": 900, "y": 245, "width": 280, "height": 25, "text": "FRESH FRUIT JUICE . . . . . . .$ 2.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Drink 2"},
        {"id": "drink-3-name", "type": "text", "x": 900, "y": 280, "width": 280, "height": 25, "text": "COFFEE . . . . . . . . . . . . . . . . .$ 2.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Drink 3"},
        {"id": "drink-4-name", "type": "text", "x": 900, "y": 315, "width": 280, "height": 25, "text": "TEA . . . . . . . . . . . . . . . . . . . . $ 2.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Drink 4"},
        {"id": "drink-5-name", "type": "text", "x": 900, "y": 350, "width": 280, "height": 25, "text": "WINES . . . . . . . . . . . . . . . . . . $ 2.00", "fontSize": 13, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "name": "Drink 5"},
        {"id": "hours-text", "type": "text", "x": 900, "y": 420, "width": 280, "height": 30, "text": "DAILY FROM 12PM - 23PM", "fontSize": 14, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "align": "center", "name": "Hours"},
        {"id": "book-now-bg", "type": "figure", "x": 920, "y": 460, "width": 200, "height": 40, "fill": "#E8943B", "cornerRadius": 5, "name": "Book Now Button Background"},
        {"id": "book-now-text", "type": "text", "x": 920, "y": 465, "width": 200, "height": 35, "text": "BOOK NOW", "fontSize": 16, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#FFFFFF", "align": "center", "name": "Book Now Text"},
        {"id": "phone-number", "type": "text", "x": 880, "y": 510, "width": 280, "height": 50, "text": "089 12 456 78", "fontSize": 32, "fontFamily": "Poppins", "fontWeight": "bold", "fill": "#333333", "align": "center", "name": "Phone Number"},
        {"id": "website-url", "type": "text", "x": 700, "y": 750, "width": 500, "height": 30, "text": "WWW.RESTAURANTWEBSITE.COM", "fontSize": 14, "fontFamily": "Poppins", "fontWeight": "normal", "fill": "#666666", "align": "center", "name": "Website URL"}
      ]
    }]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
